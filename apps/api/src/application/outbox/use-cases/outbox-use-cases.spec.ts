import { randomUUID } from 'node:crypto';
import { OutboxMessage } from '../../../domain/outbox/outbox-message.entity';
import { OutboxMessageNotFoundError } from '../errors';
import { OutboxMessagesRepository } from '../outbox-messages.repository';
import { FindOutboxMessageByIdUseCase } from './find-outbox-message-by-id.use-case';
import { ListOutboxMessagesUseCase } from './list-outbox-messages.use-case';

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
});
