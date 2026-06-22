import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import { OutboxPublisherWorkerModule } from './outbox-publisher-worker.module';

async function bootstrap(): Promise<void> {
  const applicationContext = await NestFactory.createApplicationContext(
    OutboxPublisherWorkerModule,
    { bufferLogs: true },
  );

  applicationContext.useLogger(applicationContext.get(Logger));
  applicationContext.enableShutdownHooks();
}

void bootstrap();
