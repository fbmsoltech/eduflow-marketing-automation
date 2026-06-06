import { Inject, Injectable } from '@nestjs/common';
import { AutomationAction } from '../../../domain/automations/automation-action.entity';
import { AutomationActionType } from '../../../domain/automations/automation-types';
import { LeadStatus } from '../../../domain/leads/lead.entity';
import { LeadEvent } from '../../../domain/lead-events/lead-event.entity';
import { LEADS_REPOSITORY, LeadsRepository } from '../../leads/leads.repository';
import { AUTOMATIONS_REPOSITORY, AutomationsRepository } from '../automations.repository';
import {
  AutomationActionRequiresLeadError,
  InvalidAutomationActionConfigError,
  UnsupportedAutomationActionError,
} from '../errors';

@Injectable()
export class AutomationActionDispatcherService {
  constructor(
    @Inject(AUTOMATIONS_REPOSITORY)
    private readonly automationsRepository: AutomationsRepository,
    @Inject(LEADS_REPOSITORY)
    private readonly leadsRepository: LeadsRepository,
  ) {}

  async dispatch(action: AutomationAction, event: LeadEvent): Promise<void> {
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
      case AutomationActionType.SEND_NOTIFICATION:
        throw new UnsupportedAutomationActionError(action.type);
    }
  }

  async dispatchAll(actions: AutomationAction[], event: LeadEvent): Promise<void> {
    for (const action of actions) {
      await this.dispatch(action, event);
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

  private async requireLead(event: LeadEvent, actionType: AutomationActionType) {
    if (!event.leadId) throw new AutomationActionRequiresLeadError(actionType);
    const lead = await this.leadsRepository.findById(event.leadId);
    if (!lead) throw new AutomationActionRequiresLeadError(actionType);
    return lead;
  }
}
