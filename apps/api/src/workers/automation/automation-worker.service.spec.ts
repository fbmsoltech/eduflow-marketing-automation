import { Logger } from '@nestjs/common';
import { Channel, ChannelModel, ConsumeMessage, connect } from 'amqplib';
import { LeadEventNotFoundError } from '../../application/lead-events/errors';
import {
  AutomationMessageHandlerService,
  InvalidAutomationMessageError,
} from './automation-message-handler.service';
import { AutomationWorkerService } from './automation-worker.service';

jest.mock('amqplib', () => ({
  connect: jest.fn(),
}));

const mockedConnect = jest.mocked(connect);

describe('AutomationWorkerService', () => {
  const originalEnvironment = process.env;
  let handle: jest.MockedFunction<AutomationMessageHandlerService['handle']>;
  let channel: jest.Mocked<Channel>;
  let connection: jest.Mocked<ChannelModel>;
  let consumeCallback: ((message: ConsumeMessage | null) => void) | undefined;
  let assertExchange: jest.Mock;
  let assertQueue: jest.Mock;
  let bindQueue: jest.Mock;
  let prefetch: jest.Mock;
  let consume: jest.Mock;
  let ack: jest.Mock;
  let nack: jest.Mock;
  let log: jest.SpyInstance;
  let service: AutomationWorkerService;

  beforeEach(() => {
    log = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
    process.env = { ...originalEnvironment };
    handle = jest.fn();
    assertExchange = jest.fn().mockResolvedValue({ exchange: 'eduflow.events' });
    assertQueue = jest.fn().mockResolvedValue({
      queue: 'eduflow.automation.events',
      messageCount: 0,
      consumerCount: 0,
    });
    bindQueue = jest.fn().mockResolvedValue({});
    prefetch = jest.fn().mockResolvedValue({});
    consume = jest
      .fn()
      .mockImplementation((_queue: string, callback: (message: ConsumeMessage | null) => void) => {
        consumeCallback = callback;

        return Promise.resolve({ consumerTag: 'automation-consumer' });
      });
    ack = jest.fn();
    nack = jest.fn();
    channel = {
      assertExchange,
      assertQueue,
      bindQueue,
      prefetch,
      consume,
      ack,
      nack,
      cancel: jest.fn().mockResolvedValue({}),
      close: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<Channel>;
    connection = {
      createChannel: jest.fn().mockResolvedValue(channel),
      close: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<ChannelModel>;
    mockedConnect.mockResolvedValue(connection);
    service = new AutomationWorkerService({
      handle,
    } as unknown as AutomationMessageHandlerService);
  });

  afterEach(async () => {
    await service.beforeApplicationShutdown();
    process.env = originalEnvironment;
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  it('does not connect when the worker is disabled', async () => {
    process.env['AUTOMATION_WORKER_ENABLED'] = 'false';

    await service.onApplicationBootstrap();

    expect(mockedConnect).not.toHaveBeenCalled();
    expect(log).toHaveBeenCalledWith('Automation worker is disabled');
  });

  it('declares topology and consumes with configured prefetch', async () => {
    process.env['AUTOMATION_WORKER_ENABLED'] = 'true';
    process.env['AUTOMATION_WORKER_QUEUE'] = 'automation.test';
    process.env['AUTOMATION_WORKER_BINDING_KEY'] = 'lead-events.*';
    process.env['AUTOMATION_WORKER_PREFETCH'] = '25';

    await service.onApplicationBootstrap();

    expect(assertExchange).toHaveBeenCalledWith('eduflow.events', 'topic', {
      durable: true,
    });
    expect(assertQueue).toHaveBeenCalledWith('automation.test', { durable: true });
    expect(bindQueue).toHaveBeenCalledWith('automation.test', 'eduflow.events', 'lead-events.*');
    expect(prefetch).toHaveBeenCalledWith(25);
    expect(consume).toHaveBeenCalledWith('automation.test', expect.any(Function), {
      noAck: false,
    });
  });

  it('acknowledges successfully handled messages', async () => {
    process.env['AUTOMATION_WORKER_ENABLED'] = 'true';
    handle.mockResolvedValue({
      status: 'PROCESSED',
      aggregateId: 'lead-event-1',
      eventType: 'email.clicked',
    });
    await service.onApplicationBootstrap();
    const message = createConsumeMessage();

    consumeCallback?.(message);
    await Promise.resolve();

    expect(ack).toHaveBeenCalledWith(message);
    expect(nack).not.toHaveBeenCalled();
  });

  it.each([
    ['invalid payload', new InvalidAutomationMessageError('invalid')],
    ['missing lead event', new LeadEventNotFoundError('lead-event-1')],
  ])('nacks %s without requeue', async (_scenario, error) => {
    process.env['AUTOMATION_WORKER_ENABLED'] = 'true';
    handle.mockRejectedValue(error);
    await service.onApplicationBootstrap();
    const message = createConsumeMessage();

    consumeCallback?.(message);
    await Promise.resolve();

    expect(nack).toHaveBeenCalledWith(message, false, false);
  });

  it('nacks unexpected errors with requeue', async () => {
    process.env['AUTOMATION_WORKER_ENABLED'] = 'true';
    handle.mockRejectedValue(new Error('Database unavailable'));
    await service.onApplicationBootstrap();
    const message = createConsumeMessage();

    consumeCallback?.(message);
    await Promise.resolve();

    expect(nack).toHaveBeenCalledWith(message, false, true);
  });
});

function createConsumeMessage(): ConsumeMessage {
  return {
    content: Buffer.from('{}'),
    fields: {
      consumerTag: 'automation-consumer',
      deliveryTag: 1,
      redelivered: false,
      exchange: 'eduflow.events',
      routingKey: 'lead-events.email.clicked',
    },
    properties: {},
  } as ConsumeMessage;
}
