import {
  BeforeApplicationShutdown,
  Injectable,
  Logger,
  OnApplicationBootstrap,
} from '@nestjs/common';
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
      this.logger.log('Outbox publisher worker is disabled');

      return;
    }

    const intervalMs = this.resolvePositiveInteger(
      process.env['OUTBOX_PUBLISHER_INTERVAL_MS'],
      DEFAULT_OUTBOX_PUBLISHER_INTERVAL_MS,
    );

    this.logger.log(`Outbox publisher worker started with interval ${intervalMs}ms`);
    void this.runCycle();
    this.interval = setInterval(() => void this.runCycle(), intervalMs);
  }

  async beforeApplicationShutdown(): Promise<void> {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = undefined;
    }

    await this.activeCycle;
    this.logger.log('Outbox publisher worker stopped');
  }

  runCycle(): Promise<void> {
    if (this.isCycleRunning) {
      this.logger.warn('Outbox publisher cycle skipped because another cycle is running');

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

    this.logger.log(`Outbox publisher cycle started with limit ${limit}`);

    try {
      const result = await this.publishPendingOutboxMessagesUseCase.execute(limit);

      this.logger.log(
        `Outbox publisher cycle finished: processed=${result.processed} published=${result.published} failed=${result.failed}`,
      );
    } catch (error) {
      this.logger.error(`Outbox publisher cycle failed: ${this.getErrorMessage(error)}`);
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
