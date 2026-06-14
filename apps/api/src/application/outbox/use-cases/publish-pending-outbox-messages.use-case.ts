import { Inject, Injectable } from '@nestjs/common';
import { MESSAGE_BROKER, MessageBroker } from '../../messaging/message-broker';
import {
  OUTBOX_MESSAGES_REPOSITORY,
  OutboxMessagesRepository,
} from '../outbox-messages.repository';

const DEFAULT_OUTBOX_PUBLISH_LIMIT = 100;

export interface PublishPendingOutboxMessagesResult {
  processed: number;
  published: number;
  failed: number;
}

@Injectable()
export class PublishPendingOutboxMessagesUseCase {
  constructor(
    @Inject(OUTBOX_MESSAGES_REPOSITORY)
    private readonly outboxMessagesRepository: OutboxMessagesRepository,
    @Inject(MESSAGE_BROKER)
    private readonly messageBroker: MessageBroker,
  ) {}

  async execute(limit?: number): Promise<PublishPendingOutboxMessagesResult> {
    const pendingMessages = await this.outboxMessagesRepository.listPending(
      limit ?? this.resolveDefaultLimit(),
    );
    let published = 0;
    let failed = 0;

    for (const message of pendingMessages) {
      try {
        await this.messageBroker.publish({
          messageId: message.id,
          routingKey: `lead-events.${message.eventType}`,
          eventType: message.eventType,
          payload: {
            messageId: message.id,
            eventType: message.eventType,
            aggregateType: message.aggregateType,
            aggregateId: message.aggregateId,
            occurredAt: message.occurredAt.toISOString(),
            correlationId: message.correlationId ?? null,
            payload: message.payload,
          },
          correlationId: message.correlationId,
        });
        await this.outboxMessagesRepository.markAsPublished(message.id, new Date());
        published += 1;
      } catch (error) {
        await this.outboxMessagesRepository.markAsFailed(message.id, this.getErrorMessage(error));
        failed += 1;
      }
    }

    return {
      processed: pendingMessages.length,
      published,
      failed,
    };
  }

  private resolveDefaultLimit(): number {
    const configuredLimit = Number(process.env['OUTBOX_PUBLISH_LIMIT']);

    return Number.isInteger(configuredLimit) && configuredLimit > 0
      ? configuredLimit
      : DEFAULT_OUTBOX_PUBLISH_LIMIT;
  }

  private getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }
}
