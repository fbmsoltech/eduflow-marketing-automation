import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import {
  DeadLetterJsonObject,
  DeadLetterMessage,
} from '../../../domain/dead-letter/dead-letter-message.entity';
import {
  DEAD_LETTER_MESSAGES_REPOSITORY,
  DeadLetterMessagesRepository,
} from '../dead-letter-messages.repository';

export interface CreateDeadLetterMessageInput {
  organizationId?: string;
  outboxMessageId?: string;
  eventType: string;
  payload: DeadLetterJsonObject;
  reason: string;
  errorDetails?: DeadLetterJsonObject;
}

@Injectable()
export class CreateDeadLetterMessageUseCase {
  constructor(
    @Inject(DEAD_LETTER_MESSAGES_REPOSITORY)
    private readonly repository: DeadLetterMessagesRepository,
  ) {}

  execute(input: CreateDeadLetterMessageInput): Promise<DeadLetterMessage> {
    return this.repository.create(DeadLetterMessage.create({ id: randomUUID(), ...input }));
  }
}
