import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  DeadLetterJsonObject,
  DeadLetterMessage,
  DeadLetterMessageStatus,
} from '../../../domain/dead-letter/dead-letter-message.entity';

export class DeadLetterMessageResponseDto {
  @ApiProperty({ example: '7f23eca1-118a-409e-a784-9b4a361c2535', format: 'uuid' })
  readonly id: string;

  @ApiPropertyOptional({ example: '9a0f59cc-0d6a-4da2-af5a-b4e37f53e1b7', format: 'uuid' })
  readonly organizationId?: string;

  @ApiPropertyOptional({ example: '66006923-5e4c-4b54-a865-ccfcb21bb94a', format: 'uuid' })
  readonly outboxMessageId?: string;

  @ApiProperty({ example: 'webhook.delivery_failed' })
  readonly eventType: string;

  @ApiProperty({
    example: {
      automationExecutionId: '72199710-1843-450c-9189-2a3df171168b',
      targetUrl: 'https://example.com/webhooks/eduflow',
    },
    type: 'object',
    additionalProperties: true,
  })
  readonly payload: DeadLetterJsonObject;

  @ApiProperty({ example: 'Webhook delivery failed after 3 attempts' })
  readonly reason: string;

  @ApiPropertyOptional({
    example: {
      message: 'HTTP 503',
    },
    type: 'object',
    additionalProperties: true,
  })
  readonly errorDetails?: DeadLetterJsonObject;

  @ApiProperty({ enum: ['PENDING', 'REPROCESSED', 'IGNORED'], example: 'PENDING' })
  readonly status: DeadLetterMessageStatus;

  @ApiProperty({ example: '2026-06-21T10:31:00.000Z', format: 'date-time' })
  readonly failedAt: string;

  @ApiPropertyOptional({ example: '2026-06-21T11:00:00.000Z', format: 'date-time' })
  readonly reprocessedAt?: string;

  @ApiProperty({ example: '2026-06-21T10:31:00.000Z', format: 'date-time' })
  readonly createdAt: string;

  @ApiProperty({ example: '2026-06-21T10:31:00.000Z', format: 'date-time' })
  readonly updatedAt: string;

  private constructor(message: DeadLetterMessage) {
    this.id = message.id;
    this.organizationId = message.organizationId;
    this.outboxMessageId = message.outboxMessageId;
    this.eventType = message.eventType;
    this.payload = message.payload;
    this.reason = message.reason;
    this.errorDetails = message.errorDetails;
    this.status = message.status;
    this.failedAt = message.failedAt.toISOString();
    this.reprocessedAt = message.reprocessedAt?.toISOString();
    this.createdAt = message.createdAt.toISOString();
    this.updatedAt = message.updatedAt.toISOString();
  }

  static fromDomain(message: DeadLetterMessage): DeadLetterMessageResponseDto {
    return new DeadLetterMessageResponseDto(message);
  }
}
