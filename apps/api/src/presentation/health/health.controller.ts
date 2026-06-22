import { Controller, Get } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckResult,
  HealthCheckService,
  PrismaHealthIndicator,
} from '@nestjs/terminus';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { HealthResponseDto } from './dto/health-response.dto';
import { RabbitMQHealthIndicator } from './rabbitmq-health.indicator';

@Controller('health')
export class HealthController {
  constructor(
    private readonly healthCheckService: HealthCheckService,
    private readonly prismaHealthIndicator: PrismaHealthIndicator,
    private readonly prisma: PrismaService,
    private readonly rabbitMQHealthIndicator: RabbitMQHealthIndicator,
  ) {}

  @Get()
  getHealth(): HealthResponseDto {
    return {
      status: 'ok',
      service: 'eduflow-api',
    };
  }

  @Get('live')
  @HealthCheck()
  live(): Promise<HealthCheckResult> {
    return this.healthCheckService.check([() => Promise.resolve({ process: { status: 'up' } })]);
  }

  @Get('ready')
  @HealthCheck()
  ready(): Promise<HealthCheckResult> {
    return this.healthCheckService.check([
      () => this.prismaHealthIndicator.pingCheck('database', this.prisma),
      () => this.rabbitMQHealthIndicator.isHealthy(),
    ]);
  }
}
