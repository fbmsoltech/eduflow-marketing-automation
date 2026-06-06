import { ConfirmChannel, ChannelModel, connect } from 'amqplib';
import { RabbitMQMessageBroker } from './rabbitmq-message-broker';

jest.mock('amqplib', () => ({
  connect: jest.fn(),
}));

const mockedConnect = jest.mocked(connect);

describe('RabbitMQMessageBroker', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      RABBITMQ_URL: 'amqp://rabbitmq.test',
      RABBITMQ_EXCHANGE: 'eduflow.events',
      RABBITMQ_EXCHANGE_TYPE: 'topic',
    };
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.clearAllMocks();
  });

  it('asserts the exchange and publishes a persistent message with confirms', async () => {
    const assertExchange = jest.fn().mockResolvedValue({ exchange: 'eduflow.events' });
    const publish = jest.fn().mockReturnValue(true);
    const waitForConfirms = jest.fn().mockResolvedValue(undefined);
    const closeChannel = jest.fn().mockResolvedValue(undefined);
    const channel = {
      assertExchange,
      publish,
      waitForConfirms,
      close: closeChannel,
    } as unknown as ConfirmChannel;
    const createConfirmChannel = jest.fn().mockResolvedValue(channel);
    const closeConnection = jest.fn().mockResolvedValue(undefined);
    const connection = {
      createConfirmChannel,
      close: closeConnection,
    } as unknown as ChannelModel;
    mockedConnect.mockResolvedValue(connection);
    const broker = new RabbitMQMessageBroker();

    await broker.publish({
      messageId: 'message-1',
      routingKey: 'lead-events.form.submitted',
      eventType: 'form.submitted',
      correlationId: 'corr-123',
      payload: { eventId: 'event-1' },
    });

    expect(mockedConnect).toHaveBeenCalledWith('amqp://rabbitmq.test');
    expect(assertExchange).toHaveBeenCalledWith('eduflow.events', 'topic', {
      durable: true,
    });
    expect(publish).toHaveBeenCalledWith(
      'eduflow.events',
      'lead-events.form.submitted',
      Buffer.from(JSON.stringify({ eventId: 'event-1' })),
      {
        persistent: true,
        contentType: 'application/json',
        messageId: 'message-1',
        type: 'form.submitted',
        correlationId: 'corr-123',
      },
    );
    expect(waitForConfirms).toHaveBeenCalled();

    await broker.onModuleDestroy();

    expect(closeChannel).toHaveBeenCalled();
    expect(closeConnection).toHaveBeenCalled();
  });
});
