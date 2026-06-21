import { Inject, Injectable } from '@nestjs/common';
import { AutomationAction } from '../../../domain/automations/automation-action.entity';
import { AutomationActionType } from '../../../domain/automations/automation-types';
import { LeadStatus } from '../../../domain/leads/lead.entity';
import { LeadEvent } from '../../../domain/lead-events/lead-event.entity';
import { CreateDeadLetterMessageUseCase } from '../../dead-letter/use-cases/create-dead-letter-message.use-case';
import { LEADS_REPOSITORY, LeadsRepository } from '../../leads/leads.repository';
import { WEBHOOK_CLIENT, WebhookClient } from '../../webhooks/webhook-client';
import { AUTOMATIONS_REPOSITORY, AutomationsRepository } from '../automations.repository';
import {
  AutomationActionRequiresLeadError,
  InvalidAutomationActionConfigError,
  UnsupportedAutomationActionError,
  WebhookDeliveryFailedError,
} from '../errors';

const DEFAULT_WEBHOOK_TIMEOUT_MS = 5000;
const DEFAULT_WEBHOOK_MAX_ATTEMPTS = 3;
const DEFAULT_WEBHOOK_RETRY_DELAY_MS = 1000;

export interface AutomationActionDispatchContext {
  automationExecutionId: string;
}

@Injectable()
export class AutomationActionDispatcherService {
  constructor(
    @Inject(AUTOMATIONS_REPOSITORY)
    private readonly automationsRepository: AutomationsRepository,
    @Inject(LEADS_REPOSITORY)
    private readonly leadsRepository: LeadsRepository,
    @Inject(WEBHOOK_CLIENT)
    private readonly webhookClient: WebhookClient,
    private readonly createDeadLetterMessageUseCase: CreateDeadLetterMessageUseCase,
  ) {}

  async dispatch(
    action: AutomationAction,
    event: LeadEvent,
    context: AutomationActionDispatchContext,
  ): Promise<void> {
    switch (action.type) {
      case AutomationActionType.INCREASE_LEAD_SCORE:
        await this.changeLeadScore(action, event, 1);
        return;
      case AutomationActionType.DECREASE_LEAD_SCORE:
        await this.changeLeadScore(action, event, -1);
        return;
      case AutomationActionType.UPDATE_LEAD_STATUS:
        await this.updateLeadStatus(action, event);
        return;
      case AutomationActionType.CREATE_TASK:
        await this.createTask(action, event);
        return;
      case AutomationActionType.SEND_WEBHOOK:
        await this.sendWebhook(action, event, context);
        return;
      case AutomationActionType.SEND_NOTIFICATION:
        throw new UnsupportedAutomationActionError(action.type);
    }
  }

  async dispatchAll(
    actions: AutomationAction[],
    event: LeadEvent,
    context: AutomationActionDispatchContext,
  ): Promise<void> {
    for (const action of actions) {
      await this.dispatch(action, event, context);
    }
  }

  private async changeLeadScore(
    action: AutomationAction,
    event: LeadEvent,
    direction: 1 | -1,
  ): Promise<void> {
    const lead = await this.requireLead(event, action.type);
    const amount = action.config['amount'];

    if (typeof amount !== 'number' || !Number.isInteger(amount) || amount <= 0) {
      throw new InvalidAutomationActionConfigError(
        action.type,
        'amount must be a positive integer',
      );
    }

    await this.leadsRepository.updateScore(lead.id, Math.max(0, lead.score + amount * direction));
  }

  private async updateLeadStatus(action: AutomationAction, event: LeadEvent): Promise<void> {
    const lead = await this.requireLead(event, action.type);
    const status = action.config['status'];

    if (typeof status !== 'string' || !Object.values(LeadStatus).includes(status as LeadStatus)) {
      throw new InvalidAutomationActionConfigError(
        action.type,
        'status must be a valid LeadStatus',
      );
    }

    await this.leadsRepository.updateStatus(lead.id, status as LeadStatus);
  }

  private async createTask(action: AutomationAction, event: LeadEvent): Promise<void> {
    const title = action.config['title'];
    const description = action.config['description'];
    const priority = action.config['priority'];
    const dueAt = action.config['dueAt'];

    if (
      typeof title !== 'string' ||
      !title.trim() ||
      (description !== undefined && typeof description !== 'string') ||
      (priority !== undefined &&
        (typeof priority !== 'string' ||
          !['LOW', 'MEDIUM', 'HIGH', 'URGENT'].includes(priority))) ||
      (dueAt !== undefined &&
        (typeof dueAt !== 'string' || Number.isNaN(new Date(dueAt).getTime())))
    ) {
      throw new InvalidAutomationActionConfigError(action.type, 'task fields are invalid');
    }

    await this.automationsRepository.createTask({
      organizationId: event.organizationId,
      campaignId: event.campaignId,
      leadId: event.leadId,
      title: title.trim(),
      description,
      priority: priority as 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' | undefined,
      dueAt: dueAt ? new Date(dueAt) : undefined,
    });
  }

  private async sendWebhook(
    action: AutomationAction,
    event: LeadEvent,
    context: AutomationActionDispatchContext,
  ): Promise<void> {
    const url = action.config['url'];
    const method = action.config['method'] ?? 'POST';
    const headers = this.parseHeaders(action);

    if (typeof url !== 'string' || !this.isHttpUrl(url)) {
      throw new InvalidAutomationActionConfigError(action.type, 'url must be a valid HTTP URL');
    }
    if (typeof method !== 'string' || !method.trim()) {
      throw new InvalidAutomationActionConfigError(
        action.type,
        'method must be a non-empty string',
      );
    }

    const requestPayload = {
      source: 'eduflow',
      eventType: event.eventType,
      organizationId: event.organizationId,
      campaignId: event.campaignId ?? null,
      leadId: event.leadId ?? null,
      leadEventId: event.id,
      automationFlowId: action.flowId,
      automationExecutionId: context.automationExecutionId,
      occurredAt: event.occurredAt.toISOString(),
      payload: event.payload,
    };
    const request = {
      url,
      method: method.toUpperCase(),
      headers,
      payload: requestPayload,
    };
    const maxAttempts = this.positiveIntegerFromEnvironment(
      'WEBHOOK_MAX_ATTEMPTS',
      DEFAULT_WEBHOOK_MAX_ATTEMPTS,
    );
    const timeoutMs = this.positiveIntegerFromEnvironment(
      'WEBHOOK_TIMEOUT_MS',
      DEFAULT_WEBHOOK_TIMEOUT_MS,
    );
    const retryDelayMs = this.nonNegativeIntegerFromEnvironment(
      'WEBHOOK_RETRY_DELAY_MS',
      DEFAULT_WEBHOOK_RETRY_DELAY_MS,
    );
    let finalError = new WebhookDeliveryFailedError('Webhook delivery failed', maxAttempts);

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        const response = await this.webhookClient.send({ ...request, timeoutMs });
        if (response.statusCode >= 200 && response.statusCode < 300) return;

        finalError = new WebhookDeliveryFailedError(
          `Webhook returned HTTP status ${response.statusCode}`,
          attempt,
          response.statusCode,
        );
      } catch (error) {
        finalError = new WebhookDeliveryFailedError(this.errorMessage(error), attempt);
      }

      if (attempt < maxAttempts) await this.delay(retryDelayMs);
    }

    await this.createDeadLetterMessageUseCase.execute({
      organizationId: event.organizationId,
      eventType: 'webhook.delivery_failed',
      reason: 'Webhook delivery failed after maximum attempts',
      payload: {
        action: {
          id: action.id,
          type: action.type,
          flowId: action.flowId,
          config: action.config,
        },
        request,
      },
      errorDetails: {
        error: finalError.message,
        attempts: maxAttempts,
        ...(finalError.statusCode === undefined ? {} : { statusCode: finalError.statusCode }),
      },
    });

    throw finalError;
  }

  private parseHeaders(action: AutomationAction): Record<string, string> {
    const headers = action.config['headers'];
    if (headers === undefined) return {};
    if (!headers || typeof headers !== 'object' || Array.isArray(headers)) {
      throw new InvalidAutomationActionConfigError(action.type, 'headers must be an object');
    }

    const entries = Object.entries(headers);
    if (entries.some(([, value]) => typeof value !== 'string')) {
      throw new InvalidAutomationActionConfigError(action.type, 'header values must be strings');
    }
    return Object.fromEntries(entries) as Record<string, string>;
  }

  private isHttpUrl(value: string): boolean {
    try {
      return ['http:', 'https:'].includes(new URL(value).protocol);
    } catch {
      return false;
    }
  }

  private positiveIntegerFromEnvironment(name: string, fallback: number): number {
    const value = Number(process.env[name]);
    return Number.isInteger(value) && value > 0 ? value : fallback;
  }

  private nonNegativeIntegerFromEnvironment(name: string, fallback: number): number {
    const value = Number(process.env[name]);
    return Number.isInteger(value) && value >= 0 ? value : fallback;
  }

  private delay(milliseconds: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, milliseconds));
  }

  private errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : 'Unknown webhook delivery error';
  }

  private async requireLead(event: LeadEvent, actionType: AutomationActionType) {
    if (!event.leadId) throw new AutomationActionRequiresLeadError(actionType);
    const lead = await this.leadsRepository.findById(event.leadId);
    if (!lead) throw new AutomationActionRequiresLeadError(actionType);
    return lead;
  }
}
