import { OutboxMessage, OutboxMessagePayload } from '../../../domain/outbox/outbox-message.entity';

export class OutboxMessageResponseDto {
  readonly id: string;
  readonly organizationId?: string;
  readonly aggregateId: string;
  readonly aggregateType: string;
  readonly eventType: string;
  readonly payload: OutboxMessagePayload;
  readonly status: string;
  readonly attempts: number;
  readonly occurredAt: string;
  readonly publishedAt?: string;
  readonly lastError?: string;
  readonly correlationId?: string;
  readonly idempotencyKey?: string;
  readonly createdAt: string;
  readonly updatedAt: string;

  private constructor(outboxMessage: OutboxMessage) {
    this.id = outboxMessage.id;
    this.organizationId = outboxMessage.organizationId;
    this.aggregateId = outboxMessage.aggregateId;
    this.aggregateType = outboxMessage.aggregateType;
    this.eventType = outboxMessage.eventType;
    this.payload = outboxMessage.payload;
    this.status = outboxMessage.status;
    this.attempts = outboxMessage.attempts;
    this.occurredAt = outboxMessage.occurredAt.toISOString();
    this.publishedAt = outboxMessage.publishedAt?.toISOString();
    this.lastError = outboxMessage.lastError;
    this.correlationId = outboxMessage.correlationId;
    this.idempotencyKey = outboxMessage.idempotencyKey;
    this.createdAt = outboxMessage.createdAt.toISOString();
    this.updatedAt = outboxMessage.updatedAt.toISOString();
  }

  static fromDomain(outboxMessage: OutboxMessage): OutboxMessageResponseDto {
    return new OutboxMessageResponseDto(outboxMessage);
  }
}
