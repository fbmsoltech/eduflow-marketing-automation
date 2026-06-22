import { DeadLetterJsonObject } from '../../domain/dead-letter/dead-letter-message.entity';

export const WEBHOOK_CLIENT = Symbol('WEBHOOK_CLIENT');

export interface SendWebhookInput {
  url: string;
  method: string;
  headers: Record<string, string>;
  payload: DeadLetterJsonObject;
  timeoutMs: number;
}

export interface SendWebhookResult {
  statusCode: number;
}

export interface WebhookClient {
  send(input: SendWebhookInput): Promise<SendWebhookResult>;
}
