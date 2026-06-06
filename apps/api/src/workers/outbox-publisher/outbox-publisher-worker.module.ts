import { Module } from '@nestjs/common';
import { OutboxModule } from '../../presentation/outbox/outbox.module';
import { OutboxPublisherService } from './outbox-publisher.service';

@Module({
  imports: [OutboxModule],
  providers: [OutboxPublisherService],
})
export class OutboxPublisherWorkerModule {}
