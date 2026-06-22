import { ChannelModel, connect } from 'amqplib';
import { RabbitMQHealthIndicator } from './rabbitmq-health.indicator';

jest.mock('amqplib', () => ({
  connect: jest.fn(),
}));

const mockedConnect = jest.mocked(connect);

describe('RabbitMQHealthIndicator', () => {
  const originalEnvironment = process.env;
  const session = {
    up: jest.fn(() => ({ rabbitmq: { status: 'up' } })),
    down: jest.fn((details: object) => ({ rabbitmq: { status: 'down', ...details } })),
  };
  const service = new RabbitMQHealthIndicator({
    check: jest.fn(() => session),
  } as never);

  beforeEach(() => {
    process.env = { ...originalEnvironment, RABBITMQ_URL: 'amqp://rabbitmq.test' };
    jest.clearAllMocks();
  });

  afterAll(() => {
    process.env = originalEnvironment;
  });

  it('reports RabbitMQ as ready when a connection can be opened and closed', async () => {
    const close = jest.fn().mockResolvedValue(undefined);
    mockedConnect.mockResolvedValue({ close } as unknown as ChannelModel);

    await expect(service.isHealthy()).resolves.toEqual({ rabbitmq: { status: 'up' } });
    expect(mockedConnect).toHaveBeenCalledWith('amqp://rabbitmq.test');
    expect(close).toHaveBeenCalled();
  });

  it('reports RabbitMQ as unavailable when connection fails', async () => {
    mockedConnect.mockRejectedValue(new Error('Connection refused'));

    await expect(service.isHealthy()).resolves.toEqual({
      rabbitmq: { status: 'down', message: 'Connection refused' },
    });
  });
});
