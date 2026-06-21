import { Module } from '@nestjs/common';
import { WEBHOOK_CLIENT } from '../../application/webhooks/webhook-client';
import { NativeFetchWebhookClient } from './native-fetch-webhook-client';

@Module({
  providers: [{ provide: WEBHOOK_CLIENT, useClass: NativeFetchWebhookClient }],
  exports: [WEBHOOK_CLIENT],
})
export class WebhooksModule {}
