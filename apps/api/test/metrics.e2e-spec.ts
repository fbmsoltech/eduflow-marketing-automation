import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { Server } from 'node:http';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/infrastructure/prisma/prisma.service';

describe('GET /metrics', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue({
        $connect: jest.fn(),
        $disconnect: jest.fn(),
        outboxMessage: {
          count: jest
            .fn()
            .mockResolvedValueOnce(1)
            .mockResolvedValueOnce(2)
            .mockResolvedValueOnce(3),
        },
        deadLetterMessage: {
          count: jest.fn().mockResolvedValueOnce(4).mockResolvedValueOnce(5),
        },
        automationExecution: {
          count: jest.fn().mockResolvedValueOnce(6).mockResolvedValueOnce(7),
        },
        automationFlow: {
          count: jest.fn().mockResolvedValue(8),
        },
      })
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => app.close());

  it('returns application metrics in Prometheus format', async () => {
    const response = await request(app.getHttpServer() as Server)
      .get('/metrics')
      .expect(200);

    expect(response.headers['content-type']).toContain('text/plain');
    expect(response.text).toContain('eduflow_outbox_pending_total 1');
    expect(response.text).toContain('eduflow_outbox_published_total 2');
    expect(response.text).toContain('eduflow_outbox_failed_total 3');
    expect(response.text).toContain('eduflow_dead_letters_pending_total 4');
    expect(response.text).toContain('eduflow_dead_letters_ignored_total 5');
    expect(response.text).toContain('eduflow_automation_executions_succeeded_total 6');
    expect(response.text).toContain('eduflow_automation_executions_failed_total 7');
    expect(response.text).toContain('eduflow_automation_flows_active_total 8');
  });
});
