import { Injectable, Logger } from '@nestjs/common';
import {
  EvaluateAutomationsForLeadEventUseCase,
  EvaluateAutomationsResult,
} from '../../application/automations/use-cases/evaluate-automations-for-lead-event.use-case';

export class InvalidAutomationMessageError extends Error {
  constructor(reason: string) {
    super(`Invalid automation message: ${reason}`);
    this.name = 'InvalidAutomationMessageError';
  }
}

export interface AutomationMessageHandlerResult {
  status: 'IGNORED' | 'PROCESSED';
  aggregateId: string;
  eventType: string;
  execution?: EvaluateAutomationsResult;
}

interface AutomationMessageEnvelope {
  messageId: string;
  eventType: string;
  aggregateType: string;
  aggregateId: string;
  occurredAt: string;
  correlationId?: string | null;
  payload: Record<string, unknown>;
}

@Injectable()
export class AutomationMessageHandlerService {
  private readonly logger = new Logger(AutomationMessageHandlerService.name);

  constructor(
    private readonly evaluateAutomationsForLeadEventUseCase: EvaluateAutomationsForLeadEventUseCase,
  ) {}

  async handle(content: Buffer): Promise<AutomationMessageHandlerResult> {
    const message = this.parseMessage(content);

    if (message.aggregateType !== 'LeadEvent') {
      this.logger.log({
        event: 'automation.message.ignored',
        messageId: message.messageId,
        correlationId: message.correlationId,
        aggregateType: message.aggregateType,
        aggregateId: message.aggregateId,
        eventType: message.eventType,
      });

      return {
        status: 'IGNORED',
        aggregateId: message.aggregateId,
        eventType: message.eventType,
      };
    }

    const execution = await this.evaluateAutomationsForLeadEventUseCase.execute(
      message.aggregateId,
    );

    this.logger.log({
      event: 'automation.engine.executed',
      messageId: message.messageId,
      correlationId: message.correlationId,
      leadEventId: message.aggregateId,
      eventType: message.eventType,
      matchedFlows: execution.matchedFlows,
      executedFlows: execution.executedFlows,
      skippedFlows: execution.skippedFlows,
      failedFlows: execution.failedFlows,
    });

    return {
      status: 'PROCESSED',
      aggregateId: message.aggregateId,
      eventType: message.eventType,
      execution,
    };
  }

  private parseMessage(content: Buffer): AutomationMessageEnvelope {
    let parsed: unknown;

    try {
      parsed = JSON.parse(content.toString('utf8')) as unknown;
    } catch {
      throw new InvalidAutomationMessageError('content is not valid JSON');
    }

    if (!this.isRecord(parsed)) {
      throw new InvalidAutomationMessageError('content must be an object');
    }

    const messageId = this.requireNonEmptyString(parsed, 'messageId');
    const eventType = this.requireNonEmptyString(parsed, 'eventType');
    const aggregateType = this.requireNonEmptyString(parsed, 'aggregateType');
    const aggregateId = this.requireNonEmptyString(parsed, 'aggregateId');
    const occurredAt = this.requireNonEmptyString(parsed, 'occurredAt');

    if (Number.isNaN(Date.parse(occurredAt))) {
      throw new InvalidAutomationMessageError('occurredAt must be a valid date');
    }

    const correlationId = parsed['correlationId'];

    if (
      correlationId !== undefined &&
      correlationId !== null &&
      typeof correlationId !== 'string'
    ) {
      throw new InvalidAutomationMessageError('correlationId must be a string or null');
    }

    const payload = parsed['payload'];

    if (!this.isRecord(payload)) {
      throw new InvalidAutomationMessageError('payload must be an object');
    }

    return {
      messageId,
      eventType,
      aggregateType,
      aggregateId,
      occurredAt,
      correlationId,
      payload,
    };
  }

  private requireNonEmptyString(record: Record<string, unknown>, field: string): string {
    const value = record[field];

    if (typeof value !== 'string' || !value.trim()) {
      throw new InvalidAutomationMessageError(`${field} must be a non-empty string`);
    }

    return value.trim();
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }
}
