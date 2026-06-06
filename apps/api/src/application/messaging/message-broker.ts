import { OutboxMessagePayload } from '../../domain/outbox/outbox-message.entity';

export const MESSAGE_BROKER = Symbol('MESSAGE_BROKER');

export interface PublishMessageInput {
  messageId: string;
  routingKey: string;
  eventType: string;
  payload: OutboxMessagePayload;
  correlationId?: string;
}

export interface MessageBroker {
  publish(input: PublishMessageInput): Promise<void>;
}
