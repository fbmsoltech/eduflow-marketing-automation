import { Logger } from '@nestjs/common';
import { PublishPendingOutboxMessagesUseCase } from '../../application/outbox/use-cases/publish-pending-outbox-messages.use-case';
import { OutboxPublisherService } from './outbox-publisher.service';

describe('OutboxPublisherService', () => {
  const originalEnvironment = process.env;
  let execute: jest.MockedFunction<PublishPendingOutboxMessagesUseCase['execute']>;
  let log: jest.SpyInstance;
  let warn: jest.SpyInstance;
  let error: jest.SpyInstance;
  let service: OutboxPublisherService;

  beforeEach(() => {
    jest.useFakeTimers();
    log = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    error = jest.spyOn(Logger.prototype, 'error').mockImplementation();
    process.env = { ...originalEnvironment };
    execute = jest.fn();
    service = new OutboxPublisherService({
      execute,
    } as unknown as PublishPendingOutboxMessagesUseCase);
  });

  afterEach(async () => {
    await service.beforeApplicationShutdown();
    jest.restoreAllMocks();
    jest.useRealTimers();
    process.env = originalEnvironment;
  });

  it('does not start cycles when the worker is disabled', async () => {
    process.env['OUTBOX_PUBLISHER_ENABLED'] = 'false';

    service.onApplicationBootstrap();
    await jest.advanceTimersByTimeAsync(10_000);
    expect(execute).not.toHaveBeenCalled();
    expect(log).toHaveBeenCalledWith({
      event: 'outbox.worker.disabled',
    });
  });

  it('runs immediately and periodically with the configured publish limit', async () => {
    let intervalCallback: (() => void) | undefined;
    const setIntervalSpy = jest.spyOn(global, 'setInterval').mockImplementation((callback) => {
      intervalCallback = callback;

      return {} as NodeJS.Timeout;
    });
    process.env['OUTBOX_PUBLISHER_ENABLED'] = 'true';
    process.env['OUTBOX_PUBLISHER_INTERVAL_MS'] = '1000';
    process.env['OUTBOX_PUBLISH_LIMIT'] = '25';
    execute.mockResolvedValue({ processed: 2, published: 1, failed: 1 });

    service.onApplicationBootstrap();
    await service.beforeApplicationShutdown();
    intervalCallback?.();
    await service.beforeApplicationShutdown();
    intervalCallback?.();
    await service.beforeApplicationShutdown();

    expect(execute).toHaveBeenCalledTimes(3);
    expect(execute).toHaveBeenCalledWith(25);
    expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 1_000);
    expect(log).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'outbox.cycle.finished',
        processed: 2,
        published: 1,
        failed: 1,
      }),
    );
  });

  it('skips a concurrent cycle', async () => {
    let resolveCycle:
      | ((value: { processed: number; published: number; failed: number }) => void)
      | undefined;
    execute.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveCycle = resolve;
        }),
    );

    const firstCycle = service.runCycle();
    await service.runCycle();

    expect(execute).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith({
      event: 'outbox.cycle.skipped',
      reason: 'cycle_already_running',
    });

    resolveCycle?.({ processed: 0, published: 0, failed: 0 });
    await firstCycle;
  });

  it('handles cycle errors and continues running', async () => {
    execute.mockRejectedValueOnce(new Error('Database unavailable')).mockResolvedValueOnce({
      processed: 0,
      published: 0,
      failed: 0,
    });

    await expect(service.runCycle()).resolves.toBeUndefined();
    await expect(service.runCycle()).resolves.toBeUndefined();

    expect(execute).toHaveBeenCalledTimes(2);
    expect(error).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'outbox.cycle.failed',
        error: 'Database unavailable',
      }),
    );
  });
});
