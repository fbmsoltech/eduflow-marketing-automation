import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ChannelModel, ConfirmChannel, Options, connect } from 'amqplib';
import { MessageBroker, PublishMessageInput } from '../../application/messaging/message-broker';

const DEFAULT_RABBITMQ_URL = 'amqp://eduflow:eduflow@localhost:5672';
const DEFAULT_RABBITMQ_EXCHANGE = 'eduflow.events';
const DEFAULT_RABBITMQ_EXCHANGE_TYPE = 'topic';

@Injectable()
export class RabbitMQMessageBroker implements MessageBroker, OnModuleDestroy {
  private connection?: ChannelModel;
  private channel?: ConfirmChannel;

  async publish(input: PublishMessageInput): Promise<void> {
    const channel = await this.getChannel();
    const options: Options.Publish = {
      persistent: true,
      contentType: 'application/json',
      messageId: input.messageId,
      type: input.eventType,
      correlationId: input.correlationId,
    };

    channel.publish(
      this.exchange,
      input.routingKey,
      Buffer.from(JSON.stringify(input.payload)),
      options,
    );
    await channel.waitForConfirms();
  }

  async onModuleDestroy(): Promise<void> {
    await this.channel?.close();
    await this.connection?.close();
  }

  private async getChannel(): Promise<ConfirmChannel> {
    if (this.channel) {
      return this.channel;
    }

    const connection = await connect(process.env['RABBITMQ_URL'] ?? DEFAULT_RABBITMQ_URL);
    const channel = await connection.createConfirmChannel();
    await channel.assertExchange(this.exchange, this.exchangeType, {
      durable: true,
    });
    this.connection = connection;
    this.channel = channel;

    return channel;
  }

  private get exchange(): string {
    return process.env['RABBITMQ_EXCHANGE']?.trim() || DEFAULT_RABBITMQ_EXCHANGE;
  }

  private get exchangeType(): string {
    return process.env['RABBITMQ_EXCHANGE_TYPE']?.trim() || DEFAULT_RABBITMQ_EXCHANGE_TYPE;
  }
}
