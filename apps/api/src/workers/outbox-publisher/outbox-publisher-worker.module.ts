import { Module } from '@nestjs/common';
import { ObservabilityModule } from '../../infrastructure/observability/observability.module';
import { OutboxModule } from '../../presentation/outbox/outbox.module';
import { OutboxPublisherService } from './outbox-publisher.service';

@Module({
  imports: [ObservabilityModule, OutboxModule],
  providers: [OutboxPublisherService],
})
export class OutboxPublisherWorkerModule {}
