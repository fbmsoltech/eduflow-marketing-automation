import {
  BeforeApplicationShutdown,
  Injectable,
  Logger,
  OnApplicationBootstrap,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PublishPendingOutboxMessagesUseCase } from '../../application/outbox/use-cases/publish-pending-outbox-messages.use-case';

const DEFAULT_OUTBOX_PUBLISHER_INTERVAL_MS = 5_000;
const DEFAULT_OUTBOX_PUBLISH_LIMIT = 100;

@Injectable()
export class OutboxPublisherService implements OnApplicationBootstrap, BeforeApplicationShutdown {
  private readonly logger = new Logger(OutboxPublisherService.name);
  private interval?: NodeJS.Timeout;
  private isCycleRunning = false;
  private activeCycle?: Promise<void>;

  constructor(
    private readonly publishPendingOutboxMessagesUseCase: PublishPendingOutboxMessagesUseCase,
  ) {}

  onApplicationBootstrap(): void {
    if (!this.isEnabled()) {
      this.logger.log({
        event: 'outbox.worker.disabled',
      });

      return;
    }

    const intervalMs = this.resolvePositiveInteger(
      process.env['OUTBOX_PUBLISHER_INTERVAL_MS'],
      DEFAULT_OUTBOX_PUBLISHER_INTERVAL_MS,
    );

    this.logger.log({
      event: 'outbox.worker.started',
      intervalMs,
    });
    void this.runCycle();
    this.interval = setInterval(() => void this.runCycle(), intervalMs);
  }

  async beforeApplicationShutdown(): Promise<void> {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = undefined;
    }

    await this.activeCycle;
    this.logger.log({
      event: 'outbox.worker.stopped',
    });
  }

  runCycle(): Promise<void> {
    if (this.isCycleRunning) {
      this.logger.warn({
        event: 'outbox.cycle.skipped',
        reason: 'cycle_already_running',
      });

      return Promise.resolve();
    }

    this.isCycleRunning = true;
    const cycle = this.executeCycle().finally(() => {
      this.isCycleRunning = false;
      this.activeCycle = undefined;
    });
    this.activeCycle = cycle;

    return cycle;
  }

  private async executeCycle(): Promise<void> {
    const limit = this.resolvePositiveInteger(
      process.env['OUTBOX_PUBLISH_LIMIT'],
      DEFAULT_OUTBOX_PUBLISH_LIMIT,
    );
    const cycleId = randomUUID();
    const startedAt = Date.now();

    this.logger.log({
      event: 'outbox.cycle.started',
      cycleId,
      limit,
    });

    try {
      const result = await this.publishPendingOutboxMessagesUseCase.execute(limit);

      this.logger.log({
        event: 'outbox.cycle.finished',
        cycleId,
        durationMs: Date.now() - startedAt,
        ...result,
      });
    } catch (error) {
      this.logger.error({
        event: 'outbox.cycle.failed',
        cycleId,
        durationMs: Date.now() - startedAt,
        error: this.getErrorMessage(error),
      });
    }
  }

  private isEnabled(): boolean {
    return process.env['OUTBOX_PUBLISHER_ENABLED']?.trim().toLowerCase() === 'true';
  }

  private resolvePositiveInteger(value: string | undefined, fallback: number): number {
    const parsedValue = Number(value);

    return Number.isInteger(parsedValue) && parsedValue > 0 ? parsedValue : fallback;
  }

  private getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }
}
