import { NestFactory } from '@nestjs/core';
import { OutboxPublisherWorkerModule } from './outbox-publisher-worker.module';

async function bootstrap(): Promise<void> {
  const applicationContext = await NestFactory.createApplicationContext(
    OutboxPublisherWorkerModule,
  );

  applicationContext.enableShutdownHooks();
}

void bootstrap();
