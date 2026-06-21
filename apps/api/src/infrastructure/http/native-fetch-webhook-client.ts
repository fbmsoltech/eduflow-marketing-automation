import { Injectable } from '@nestjs/common';
import {
  SendWebhookInput,
  SendWebhookResult,
  WebhookClient,
} from '../../application/webhooks/webhook-client';

@Injectable()
export class NativeFetchWebhookClient implements WebhookClient {
  async send(input: SendWebhookInput): Promise<SendWebhookResult> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), input.timeoutMs);

    try {
      const response = await fetch(input.url, {
        method: input.method,
        headers: {
          'content-type': 'application/json',
          ...input.headers,
        },
        body: JSON.stringify(input.payload),
        signal: controller.signal,
      });

      return { statusCode: response.status };
    } finally {
      clearTimeout(timeout);
    }
  }
}
