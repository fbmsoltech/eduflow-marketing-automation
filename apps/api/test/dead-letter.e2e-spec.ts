import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import type { Server } from 'node:http';
import request from 'supertest';
import {
  DEAD_LETTER_MESSAGES_REPOSITORY,
  DeadLetterMessagesRepository,
} from '../src/application/dead-letter/dead-letter-messages.repository';
import { AppModule } from '../src/app.module';
import { DeadLetterMessage } from '../src/domain/dead-letter/dead-letter-message.entity';
import { PrismaService } from '../src/infrastructure/prisma/prisma.service';

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

describe('Dead letter endpoints', () => {
  let app: INestApplication;
  let server: Server;
  let repository: InMemoryDeadLetterMessagesRepository;
  let message: DeadLetterMessage;

  beforeEach(async () => {
    repository = new InMemoryDeadLetterMessagesRepository();
    message = await repository.create(
      DeadLetterMessage.create({
        id: randomUUID(),
        organizationId: randomUUID(),
        eventType: 'webhook.delivery_failed',
        reason: 'Webhook delivery failed after maximum attempts',
        payload: { request: { url: 'https://example.com/hooks' } },
        errorDetails: { error: 'Connection refused', attempts: 3 },
      }),
    );
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(DEAD_LETTER_MESSAGES_REPOSITORY)
      .useValue(repository)
      .overrideProvider(PrismaService)
      .useValue({ $connect: jest.fn(), $disconnect: jest.fn() })
      .compile();
    app = moduleRef.createNestApplication();
    await app.init();
    server = app.getHttpServer() as Server;
  });

  afterEach(async () => app.close());

  it('lists and finds dead letter messages', async () => {
    const list = await request(server).get('/dead-letter/messages').expect(200);
    expect(list.body as unknown).toEqual([
      expect.objectContaining({ id: message.id, status: 'PENDING' }),
    ]);

    await request(server)
      .get(`/dead-letter/messages/${message.id}`)
      .expect(200)
      .expect((response) => {
        expect(response.body as unknown).toEqual(
          expect.objectContaining({ id: message.id, eventType: 'webhook.delivery_failed' }),
        );
      });
  });

  it('ignores a dead letter message', async () => {
    await request(server)
      .patch(`/dead-letter/messages/${message.id}/ignore`)
      .expect(200)
      .expect((response) => {
        expect(response.body as unknown).toEqual(expect.objectContaining({ status: 'IGNORED' }));
      });
  });

  it('returns not found for missing messages', async () => {
    const id = randomUUID();
    await request(server).get(`/dead-letter/messages/${id}`).expect(404);
    await request(server).patch(`/dead-letter/messages/${id}/ignore`).expect(404);
  });
});
