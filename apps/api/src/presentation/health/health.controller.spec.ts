import { HealthController } from './health.controller';

describe('HealthController', () => {
  const healthCheckService = {
    check: jest.fn(async (indicators: Array<() => Promise<Record<string, { status: string }>>>) => {
      const results = await Promise.all(indicators.map((indicator) => indicator()));
      const details = results.reduce<Record<string, { status: string }>>(
        (merged, result) => ({ ...merged, ...result }),
        {},
      );

      return {
        status: 'ok',
        info: details,
        error: {},
        details,
      };
    }),
  };
  const prismaHealthIndicator = {
    pingCheck: jest.fn().mockResolvedValue({ database: { status: 'up' } }),
  };
  const prisma = {};
  const rabbitMQHealthIndicator = {
    isHealthy: jest.fn().mockResolvedValue({ rabbitmq: { status: 'up' } }),
  };
  const controller = new HealthController(
    healthCheckService as never,
    prismaHealthIndicator as never,
    prisma as never,
    rabbitMQHealthIndicator as never,
  );

  it('returns the application status', () => {
    expect(controller.getHealth()).toEqual({
      status: 'ok',
      service: 'eduflow-api',
    });
  });

  it('reports liveness without external dependencies', async () => {
    await expect(controller.live()).resolves.toEqual(
      expect.objectContaining({
        status: 'ok',
        details: { process: { status: 'up' } },
      }),
    );
  });

  it('checks PostgreSQL and RabbitMQ readiness', async () => {
    await expect(controller.ready()).resolves.toEqual(
      expect.objectContaining({
        status: 'ok',
        details: {
          database: { status: 'up' },
          rabbitmq: { status: 'up' },
        },
      }),
    );
    expect(prismaHealthIndicator.pingCheck).toHaveBeenCalledWith('database', prisma);
    expect(rabbitMQHealthIndicator.isHealthy).toHaveBeenCalled();
  });
});
