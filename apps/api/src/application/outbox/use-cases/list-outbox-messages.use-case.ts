import { Inject, Injectable } from '@nestjs/common';
import { OutboxMessage } from '../../../domain/outbox/outbox-message.entity';
import {
  OUTBOX_MESSAGES_REPOSITORY,
  OutboxMessagesRepository,
} from '../outbox-messages.repository';

@Injectable()
export class ListOutboxMessagesUseCase {
  constructor(
    @Inject(OUTBOX_MESSAGES_REPOSITORY)
    private readonly outboxMessagesRepository: OutboxMessagesRepository,
  ) {}

  execute(): Promise<OutboxMessage[]> {
    return this.outboxMessagesRepository.list();
  }
}
