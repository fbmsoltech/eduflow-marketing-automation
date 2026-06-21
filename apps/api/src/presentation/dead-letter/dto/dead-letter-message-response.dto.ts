import {
  DeadLetterJsonObject,
  DeadLetterMessage,
  DeadLetterMessageStatus,
} from '../../../domain/dead-letter/dead-letter-message.entity';

export class DeadLetterMessageResponseDto {
  readonly id: string;
  readonly organizationId?: string;
  readonly outboxMessageId?: string;
  readonly eventType: string;
  readonly payload: DeadLetterJsonObject;
  readonly reason: string;
  readonly errorDetails?: DeadLetterJsonObject;
  readonly status: DeadLetterMessageStatus;
  readonly failedAt: string;
  readonly reprocessedAt?: string;
  readonly createdAt: string;
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
