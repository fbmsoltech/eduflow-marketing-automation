import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OutboxMessage, OutboxMessagePayload } from '../../../domain/outbox/outbox-message.entity';

export class OutboxMessageResponseDto {
  @ApiProperty({ example: '66006923-5e4c-4b54-a865-ccfcb21bb94a', format: 'uuid' })
  readonly id: string;

  @ApiPropertyOptional({ example: '9a0f59cc-0d6a-4da2-af5a-b4e37f53e1b7', format: 'uuid' })
  readonly organizationId?: string;

  @ApiProperty({ example: '1ef567c6-2a55-4f0b-892c-155d073729b1', format: 'uuid' })
  readonly aggregateId: string;

  @ApiProperty({ example: 'LeadEvent' })
  readonly aggregateType: string;

  @ApiProperty({ example: 'email.clicked' })
  readonly eventType: string;

  @ApiProperty({
    example: {
      eventType: 'email.clicked',
      leadId: '11fc9f71-feba-4fe4-a09c-04fc96577a8d',
    },
    type: 'object',
    additionalProperties: true,
  })
  readonly payload: OutboxMessagePayload;

  @ApiProperty({
    enum: ['PENDING', 'PROCESSING', 'PUBLISHED', 'FAILED', 'DEAD_LETTERED'],
    example: 'PENDING',
  })
  readonly status: string;

  @ApiProperty({ example: 0 })
  readonly attempts: number;

  @ApiProperty({ example: '2026-06-21T10:30:00.000Z', format: 'date-time' })
  readonly occurredAt: string;

  @ApiPropertyOptional({ example: '2026-06-21T10:30:05.000Z', format: 'date-time' })
  readonly publishedAt?: string;

  @ApiPropertyOptional({ example: 'RabbitMQ connection unavailable' })
  readonly lastError?: string;

  @ApiPropertyOptional({ example: 'demo-001' })
  readonly correlationId?: string;

  @ApiPropertyOptional({ example: 'lead-event-001' })
  readonly idempotencyKey?: string;

  @ApiProperty({ example: '2026-06-21T10:30:00.000Z', format: 'date-time' })
  readonly createdAt: string;

  @ApiProperty({ example: '2026-06-21T10:30:00.000Z', format: 'date-time' })
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
