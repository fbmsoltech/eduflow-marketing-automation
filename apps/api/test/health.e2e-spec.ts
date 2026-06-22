import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaHealthIndicator } from '@nestjs/terminus';
import type { Server } from 'node:http';
import request from 'supertest';
import { PrismaService } from '../src/infrastructure/prisma/prisma.service';
import { AppModule } from '../src/app.module';
import { RabbitMQHealthIndicator } from '../src/presentation/health/rabbitmq-health.indicator';

describe('GET /health', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue({
        $connect: () => Promise.resolve(),
        $disconnect: () => Promise.resolve(),
      })
      .overrideProvider(PrismaHealthIndicator)
      .useValue({
        pingCheck: jest.fn().mockResolvedValue({ database: { status: 'up' } }),
      })
      .overrideProvider(RabbitMQHealthIndicator)
      .useValue({
        isHealthy: jest.fn().mockResolvedValue({ rabbitmq: { status: 'up' } }),
      })
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('returns the application status', async () => {
    const httpServer = app.getHttpServer() as Server;

    await request(httpServer).get('/health').expect(200).expect({
      status: 'ok',
      service: 'eduflow-api',
    });
  });

  it('returns liveness and readiness status', async () => {
    const httpServer = app.getHttpServer() as Server;

    await request(httpServer)
      .get('/health/live')
      .expect(200)
      .expect((response) => {
        expect(response.body as unknown).toEqual(
          expect.objectContaining({
            status: 'ok',
            details: { process: { status: 'up' } },
          }),
        );
      });

    await request(httpServer)
      .get('/health/ready')
      .expect(200)
      .expect((response) => {
        expect(response.body as unknown).toEqual(
          expect.objectContaining({
            status: 'ok',
            details: {
              database: { status: 'up' },
              rabbitmq: { status: 'up' },
            },
          }),
        );
      });
  });

  it('reuses or generates correlation IDs and returns them in the response', async () => {
    const httpServer = app.getHttpServer() as Server;

    await request(httpServer)
      .get('/health')
      .set('x-correlation-id', 'correlation-test-123')
      .expect('x-correlation-id', 'correlation-test-123')
      .expect(200);

    const generated = await request(httpServer).get('/health').expect(200);
    expect(generated.headers['x-correlation-id']).toEqual(
      expect.stringMatching(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      ),
    );
  });
});
