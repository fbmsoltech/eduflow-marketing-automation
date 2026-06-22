import { Inject, Injectable } from '@nestjs/common';
import { DeadLetterMessage } from '../../../domain/dead-letter/dead-letter-message.entity';
import {
  DEAD_LETTER_MESSAGES_REPOSITORY,
  DeadLetterMessagesRepository,
} from '../dead-letter-messages.repository';
import { DeadLetterMessageNotFoundError } from '../errors';

@Injectable()
export class IgnoreDeadLetterMessageUseCase {
  constructor(
    @Inject(DEAD_LETTER_MESSAGES_REPOSITORY)
    private readonly repository: DeadLetterMessagesRepository,
  ) {}

  async execute(id: string): Promise<DeadLetterMessage> {
    const message = await this.repository.ignore(id);
    if (!message) throw new DeadLetterMessageNotFoundError(id);
    return message;
  }
}
