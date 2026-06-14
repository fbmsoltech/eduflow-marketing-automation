import { NestFactory } from '@nestjs/core';
import { AutomationWorkerModule } from './automation-worker.module';

async function bootstrap(): Promise<void> {
  const applicationContext = await NestFactory.createApplicationContext(AutomationWorkerModule);

  applicationContext.enableShutdownHooks();
}

void bootstrap();
