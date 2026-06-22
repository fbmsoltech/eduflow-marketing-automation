import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import { AutomationWorkerModule } from './automation-worker.module';

async function bootstrap(): Promise<void> {
  const applicationContext = await NestFactory.createApplicationContext(AutomationWorkerModule, {
    bufferLogs: true,
  });

  applicationContext.useLogger(applicationContext.get(Logger));
  applicationContext.enableShutdownHooks();
}

void bootstrap();
