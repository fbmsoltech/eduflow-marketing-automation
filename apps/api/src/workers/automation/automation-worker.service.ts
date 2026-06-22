import {
  BeforeApplicationShutdown,
  Injectable,
  Logger,
  OnApplicationBootstrap,
} from '@nestjs/common';
import { Channel, ChannelModel, ConsumeMessage, connect } from 'amqplib';
import { LeadEventNotFoundError } from '../../application/lead-events/errors';
import {
  AutomationMessageHandlerService,
  InvalidAutomationMessageError,
} from './automation-message-handler.service';

const DEFAULT_RABBITMQ_URL = 'amqp://eduflow:eduflow@localhost:5672';
const DEFAULT_RABBITMQ_EXCHANGE = 'eduflow.events';
const DEFAULT_RABBITMQ_EXCHANGE_TYPE = 'topic';
const DEFAULT_AUTOMATION_WORKER_QUEUE = 'eduflow.automation.events';
const DEFAULT_AUTOMATION_WORKER_BINDING_KEY = 'lead-events.#';
const DEFAULT_AUTOMATION_WORKER_PREFETCH = 10;

@Injectable()
export class AutomationWorkerService implements OnApplicationBootstrap, BeforeApplicationShutdown {
  private readonly logger = new Logger(AutomationWorkerService.name);
  private connection?: ChannelModel;
  private channel?: Channel;
  private consumerTag?: string;

  constructor(private readonly messageHandler: AutomationMessageHandlerService) {}

  async onApplicationBootstrap(): Promise<void> {
    if (!this.isEnabled()) {
      this.logger.log({
        event: 'automation.worker.disabled',
      });

      return;
    }

    const queue = this.queue;
    const bindingKey = this.bindingKey;
    const prefetch = this.prefetch;
    const connection = await connect(process.env['RABBITMQ_URL'] ?? DEFAULT_RABBITMQ_URL);
    const channel = await connection.createChannel();

    await channel.assertExchange(this.exchange, this.exchangeType, { durable: true });
    await channel.assertQueue(queue, { durable: true });
    await channel.bindQueue(queue, this.exchange, bindingKey);
    await channel.prefetch(prefetch);
    this.connection = connection;
    this.channel = channel;
    const consumer = await channel.consume(queue, (message) => void this.processMessage(message), {
      noAck: false,
    });

    this.consumerTag = consumer.consumerTag;
    this.logger.log({
      event: 'automation.worker.started',
      exchange: this.exchange,
      queue,
      bindingKey,
      prefetch,
    });
  }

  async beforeApplicationShutdown(): Promise<void> {
    if (this.channel && this.consumerTag) {
      await this.channel.cancel(this.consumerTag);
    }

    await this.channel?.close();
    await this.connection?.close();
    this.consumerTag = undefined;
    this.channel = undefined;
    this.connection = undefined;
    this.logger.log({
      event: 'automation.worker.stopped',
    });
  }

  async processMessage(message: ConsumeMessage | null): Promise<void> {
    if (!message) {
      this.logger.warn({
        event: 'automation.consumer.cancelled',
      });

      return;
    }

    if (!this.channel) {
      this.logger.error({
        event: 'automation.message.channel_missing',
      });

      return;
    }

    const messageContext = {
      messageId: this.optionalString(message.properties.messageId),
      correlationId: this.optionalString(message.properties.correlationId),
      routingKey: message.fields.routingKey,
      redelivered: message.fields.redelivered,
    };
    const startedAt = Date.now();
    this.logger.log({
      event: 'automation.message.started',
      ...messageContext,
    });

    try {
      await this.messageHandler.handle(message.content);
      this.channel.ack(message);
      this.logger.log({
        event: 'automation.message.finished',
        ...messageContext,
        durationMs: Date.now() - startedAt,
      });
    } catch (error) {
      const requeue = !(
        error instanceof InvalidAutomationMessageError || error instanceof LeadEventNotFoundError
      );

      this.channel.nack(message, false, requeue);
      this.logger.error({
        event: 'automation.message.failed',
        ...messageContext,
        durationMs: Date.now() - startedAt,
        requeue,
        error: this.getErrorMessage(error),
      });
    }
  }

  private isEnabled(): boolean {
    return process.env['AUTOMATION_WORKER_ENABLED']?.trim().toLowerCase() === 'true';
  }

  private resolvePositiveInteger(value: string | undefined, fallback: number): number {
    const parsedValue = Number(value);

    return Number.isInteger(parsedValue) && parsedValue > 0 ? parsedValue : fallback;
  }

  private get exchange(): string {
    return process.env['RABBITMQ_EXCHANGE']?.trim() || DEFAULT_RABBITMQ_EXCHANGE;
  }

  private get exchangeType(): string {
    return process.env['RABBITMQ_EXCHANGE_TYPE']?.trim() || DEFAULT_RABBITMQ_EXCHANGE_TYPE;
  }

  private get queue(): string {
    return process.env['AUTOMATION_WORKER_QUEUE']?.trim() || DEFAULT_AUTOMATION_WORKER_QUEUE;
  }

  private get bindingKey(): string {
    return (
      process.env['AUTOMATION_WORKER_BINDING_KEY']?.trim() || DEFAULT_AUTOMATION_WORKER_BINDING_KEY
    );
  }

  private get prefetch(): number {
    return this.resolvePositiveInteger(
      process.env['AUTOMATION_WORKER_PREFETCH'],
      DEFAULT_AUTOMATION_WORKER_PREFETCH,
    );
  }

  private getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }

  private optionalString(value: unknown): string | undefined {
    return typeof value === 'string' && value.trim() ? value : undefined;
  }
}
