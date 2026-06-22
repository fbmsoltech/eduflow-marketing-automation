import { randomUUID } from 'node:crypto';
import { DeadLetterMessage } from '../../../domain/dead-letter/dead-letter-message.entity';
import { DeadLetterMessagesRepository } from '../dead-letter-messages.repository';
import { DeadLetterMessageNotFoundError } from '../errors';
import { CreateDeadLetterMessageUseCase } from './create-dead-letter-message.use-case';
import { FindDeadLetterMessageByIdUseCase } from './find-dead-letter-message-by-id.use-case';
import { IgnoreDeadLetterMessageUseCase } from './ignore-dead-letter-message.use-case';
import { ListDeadLetterMessagesUseCase } from './list-dead-letter-messages.use-case';

class InMemoryDeadLetterMessagesRepository implements DeadLetterMessagesRepository {
  readonly messages = new Map<string, DeadLetterMessage>();

  create(message: DeadLetterMessage): Promise<DeadLetterMessage> {
    this.messages.set(message.id, message);
    return Promise.resolve(message);
  }

  findById(id: string): Promise<DeadLetterMessage | null> {
    return Promise.resolve(this.messages.get(id) ?? null);
  }

  list(): Promise<DeadLetterMessage[]> {
    return Promise.resolve(Array.from(this.messages.values()));
  }

  ignore(id: string): Promise<DeadLetterMessage | null> {
    const message = this.messages.get(id);
    if (!message) return Promise.resolve(null);
    const ignored = DeadLetterMessage.restore({
      ...message.toJSON(),
      status: 'IGNORED',
      updatedAt: new Date(),
    });
    this.messages.set(id, ignored);
    return Promise.resolve(ignored);
  }
}

describe('Dead letter use cases', () => {
  it('creates, lists, finds and ignores dead letter messages', async () => {
    const repository = new InMemoryDeadLetterMessagesRepository();
    const created = await new CreateDeadLetterMessageUseCase(repository).execute({
      organizationId: randomUUID(),
      eventType: 'webhook.delivery_failed',
      reason: 'Webhook delivery failed after maximum attempts',
      payload: { request: { url: 'https://example.com/hooks' } },
      errorDetails: { attempts: 3 },
    });

    await expect(new ListDeadLetterMessagesUseCase(repository).execute()).resolves.toEqual([
      created,
    ]);
    await expect(
      new FindDeadLetterMessageByIdUseCase(repository).execute(created.id),
    ).resolves.toBe(created);
    await expect(
      new IgnoreDeadLetterMessageUseCase(repository).execute(created.id),
    ).resolves.toEqual(expect.objectContaining({ status: 'IGNORED' }));
  });

  it('fails when a dead letter message does not exist', async () => {
    const repository = new InMemoryDeadLetterMessagesRepository();

    await expect(
      new FindDeadLetterMessageByIdUseCase(repository).execute(randomUUID()),
    ).rejects.toBeInstanceOf(DeadLetterMessageNotFoundError);
    await expect(
      new IgnoreDeadLetterMessageUseCase(repository).execute(randomUUID()),
    ).rejects.toBeInstanceOf(DeadLetterMessageNotFoundError);
  });
});
