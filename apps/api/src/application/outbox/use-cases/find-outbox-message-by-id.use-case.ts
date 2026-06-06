import { Inject, Injectable } from '@nestjs/common';
import { OutboxMessage } from '../../../domain/outbox/outbox-message.entity';
import { OutboxMessageNotFoundError } from '../errors';
import {
  OUTBOX_MESSAGES_REPOSITORY,
  OutboxMessagesRepository,
} from '../outbox-messages.repository';

@Injectable()
export class FindOutboxMessageByIdUseCase {
  constructor(
    @Inject(OUTBOX_MESSAGES_REPOSITORY)
    private readonly outboxMessagesRepository: OutboxMessagesRepository,
  ) {}

  async execute(id: string): Promise<OutboxMessage> {
    const outboxMessage = await this.outboxMessagesRepository.findById(id);

    if (!outboxMessage) {
      throw new OutboxMessageNotFoundError(id);
    }

    return outboxMessage;
  }
}
