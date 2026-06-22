import { DeadLetterMessage } from '../../domain/dead-letter/dead-letter-message.entity';

export const DEAD_LETTER_MESSAGES_REPOSITORY = Symbol('DEAD_LETTER_MESSAGES_REPOSITORY');

export interface DeadLetterMessagesRepository {
  create(message: DeadLetterMessage): Promise<DeadLetterMessage>;
  findById(id: string): Promise<DeadLetterMessage | null>;
  list(): Promise<DeadLetterMessage[]>;
  ignore(id: string): Promise<DeadLetterMessage | null>;
}
