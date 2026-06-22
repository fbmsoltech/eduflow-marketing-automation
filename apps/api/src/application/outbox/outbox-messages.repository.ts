import { OutboxMessage } from '../../domain/outbox/outbox-message.entity';

export const OUTBOX_MESSAGES_REPOSITORY = Symbol('OUTBOX_MESSAGES_REPOSITORY');

export interface OutboxMessagesRepository {
  create(outboxMessage: OutboxMessage): Promise<OutboxMessage>;
  findById(id: string): Promise<OutboxMessage | null>;
  list(): Promise<OutboxMessage[]>;
  listPending(limit: number): Promise<OutboxMessage[]>;
  markAsPublished(id: string, publishedAt: Date): Promise<void>;
  markAsFailed(id: string, lastError: string): Promise<void>;
}
