import { randomUUID } from 'node:crypto';
import { MessageBroker, PublishMessageInput } from '../../messaging/message-broker';
import { OutboxMessage } from '../../../domain/outbox/outbox-message.entity';
import { OutboxMessageNotFoundError } from '../errors';
import { OutboxMessagesRepository } from '../outbox-messages.repository';
import { FindOutboxMessageByIdUseCase } from './find-outbox-message-by-id.use-case';
import { ListOutboxMessagesUseCase } from './list-outbox-messages.use-case';
import { PublishPendingOutboxMessagesUseCase } from './publish-pending-outbox-messages.use-case';

class InMemoryOutboxMessagesRepository implements OutboxMessagesRepository {
  readonly outboxMessages: OutboxMessage[] = [];

  create(outboxMessage: OutboxMessage): Promise<OutboxMessage> {
    this.outboxMessages.push(outboxMessage);

    return Promise.resolve(outboxMessage);
  }

  findById(id: string): Promise<OutboxMessage | null> {
    return Promise.resolve(
      this.outboxMessages.find((outboxMessage) => outboxMessage.id === id) ?? null,
    );
  }

  list(): Promise<OutboxMessage[]> {
    return Promise.resolve(this.outboxMessages);
  }

  listPending(limit: number): Promise<OutboxMessage[]> {
    return Promise.resolve(
      this.outboxMessages
        .filter((outboxMessage) => outboxMessage.status === 'PENDING')
        .slice(0, limit),
    );
  }

  markAsPublished(id: string, publishedAt: Date): Promise<void> {
    this.update(id, {
      status: 'PUBLISHED',
      publishedAt,
      lastError: undefined,
    });

    return Promise.resolve();
  }

  markAsFailed(id: string, lastError: string): Promise<void> {
    this.update(id, { status: 'FAILED', lastError });

    return Promise.resolve();
  }

  private update(id: string, changes: Partial<ReturnType<OutboxMessage['toJSON']>>): void {
    const index = this.outboxMessages.findIndex((outboxMessage) => outboxMessage.id === id);
    const current = this.outboxMessages[index];

    if (!current) {
      return;
    }

    this.outboxMessages[index] = OutboxMessage.restore({
      ...current.toJSON(),
      ...changes,
      attempts: current.attempts + 1,
      updatedAt: new Date(),
    });
  }
}

class InMemoryMessageBroker implements MessageBroker {
  readonly publishedMessages: PublishMessageInput[] = [];

  constructor(private readonly failureMessage?: string) {}

  publish(input: PublishMessageInput): Promise<void> {
    if (this.failureMessage) {
      return Promise.reject(new Error(this.failureMessage));
    }

    this.publishedMessages.push(input);

    return Promise.resolve();
  }
}

function createOutboxMessage(): OutboxMessage {
  return OutboxMessage.create({
    id: randomUUID(),
    organizationId: randomUUID(),
    aggregateId: randomUUID(),
    aggregateType: 'LeadEvent',
    eventType: 'form.submitted',
    payload: {
      eventId: randomUUID(),
      eventType: 'form.submitted',
      organizationId: randomUUID(),
      campaignId: randomUUID(),
      leadId: randomUUID(),
      occurredAt: '2026-05-20T10:00:00.000Z',
      correlationId: 'corr-123',
      idempotencyKey: 'form.submitted:1',
      payload: { formId: 'selection-2026' },
    },
    occurredAt: new Date('2026-05-20T10:00:00.000Z'),
    correlationId: 'corr-123',
    idempotencyKey: 'form.submitted:1',
  });
}

describe('Outbox use cases', () => {
  it('lists and finds outbox messages', async () => {
    const repository = new InMemoryOutboxMessagesRepository();
    const outboxMessage = await repository.create(createOutboxMessage());
    const listUseCase = new ListOutboxMessagesUseCase(repository);
    const findUseCase = new FindOutboxMessageByIdUseCase(repository);

    await expect(listUseCase.execute()).resolves.toHaveLength(1);
    await expect(findUseCase.execute(outboxMessage.id)).resolves.toBe(outboxMessage);
  });

  it('fails when finding a missing outbox message', async () => {
    const useCase = new FindOutboxMessageByIdUseCase(new InMemoryOutboxMessagesRepository());

    await expect(useCase.execute(randomUUID())).rejects.toBeInstanceOf(OutboxMessageNotFoundError);
  });

  it('publishes pending outbox messages and marks them as published', async () => {
    const repository = new InMemoryOutboxMessagesRepository();
    const broker = new InMemoryMessageBroker();
    const outboxMessage = await repository.create(createOutboxMessage());
    const useCase = new PublishPendingOutboxMessagesUseCase(repository, broker);

    await expect(useCase.execute(1)).resolves.toEqual({
      processed: 1,
      published: 1,
      failed: 0,
    });

    expect(broker.publishedMessages[0]).toMatchObject({
      messageId: outboxMessage.id,
      routingKey: 'lead-events.form.submitted',
      eventType: 'form.submitted',
      correlationId: 'corr-123',
      payload: {
        messageId: outboxMessage.id,
        eventType: outboxMessage.eventType,
        aggregateType: outboxMessage.aggregateType,
        aggregateId: outboxMessage.aggregateId,
        occurredAt: outboxMessage.occurredAt.toISOString(),
        correlationId: outboxMessage.correlationId,
        payload: outboxMessage.payload,
      },
    });

    const publishedMessage = await repository.findById(outboxMessage.id);
    expect(publishedMessage?.status).toBe('PUBLISHED');
    expect(publishedMessage?.attempts).toBe(1);
    expect(publishedMessage?.publishedAt).toBeInstanceOf(Date);
    expect(publishedMessage?.lastError).toBeUndefined();
  });

  it('marks a pending outbox message as failed when publishing fails', async () => {
    const repository = new InMemoryOutboxMessagesRepository();
    const outboxMessage = await repository.create(createOutboxMessage());
    const useCase = new PublishPendingOutboxMessagesUseCase(
      repository,
      new InMemoryMessageBroker('RabbitMQ unavailable'),
    );

    await expect(useCase.execute(1)).resolves.toEqual({
      processed: 1,
      published: 0,
      failed: 1,
    });

    const failedMessage = await repository.findById(outboxMessage.id);
    expect(failedMessage?.status).toBe('FAILED');
    expect(failedMessage?.attempts).toBe(1);
    expect(failedMessage?.lastError).toBe('RabbitMQ unavailable');
    expect(failedMessage?.publishedAt).toBeUndefined();
  });
});
