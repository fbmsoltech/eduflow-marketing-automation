import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

const DEFAULT_PORT = 3000;

function resolvePort(value: string | undefined): number {
  if (!value) {
    return DEFAULT_PORT;
  }

  const parsedPort = Number(value);

  if (!Number.isInteger(parsedPort) || parsedPort <= 0) {
    return DEFAULT_PORT;
  }

  return parsedPort;
}

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const port = resolvePort(process.env['APP_PORT']);

  await app.listen(port);
}

void bootstrap();
