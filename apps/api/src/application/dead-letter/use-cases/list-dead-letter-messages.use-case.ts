import { Inject, Injectable } from '@nestjs/common';
import { DeadLetterMessage } from '../../../domain/dead-letter/dead-letter-message.entity';
import {
  DEAD_LETTER_MESSAGES_REPOSITORY,
  DeadLetterMessagesRepository,
} from '../dead-letter-messages.repository';

@Injectable()
export class ListDeadLetterMessagesUseCase {
  constructor(
    @Inject(DEAD_LETTER_MESSAGES_REPOSITORY)
    private readonly repository: DeadLetterMessagesRepository,
  ) {}

  execute(): Promise<DeadLetterMessage[]> {
    return this.repository.list();
  }
}
