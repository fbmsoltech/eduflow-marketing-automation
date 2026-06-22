import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { PrismaModule } from '../../infrastructure/prisma/prisma.module';
import { HealthController } from './health.controller';
import { RabbitMQHealthIndicator } from './rabbitmq-health.indicator';

@Module({
  imports: [TerminusModule, PrismaModule],
  controllers: [HealthController],
  providers: [RabbitMQHealthIndicator],
})
export class HealthModule {}
