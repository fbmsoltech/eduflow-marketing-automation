import { Controller, Get } from '@nestjs/common';
import {
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  HealthCheck,
  HealthCheckResult,
  HealthCheckService,
  PrismaHealthIndicator,
} from '@nestjs/terminus';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { HealthResponseDto } from './dto/health-response.dto';
import { RabbitMQHealthIndicator } from './rabbitmq-health.indicator';
import { ErrorResponseDto } from '../common/dto/error-response.dto';
import { LivenessResponseDto, ReadinessResponseDto } from './dto/health-check-response.dto';

@ApiTags('Health')
@ApiInternalServerErrorResponse({
  description: 'Unexpected internal server error',
  type: ErrorResponseDto,
})
@Controller('health')
export class HealthController {
  constructor(
    private readonly healthCheckService: HealthCheckService,
    private readonly prismaHealthIndicator: PrismaHealthIndicator,
    private readonly prisma: PrismaService,
    private readonly rabbitMQHealthIndicator: RabbitMQHealthIndicator,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get API health summary' })
  @ApiOkResponse({ description: 'API is running', type: HealthResponseDto })
  getHealth(): HealthResponseDto {
    return {
      status: 'ok',
      service: 'eduflow-api',
    };
  }

  @Get('live')
  @HealthCheck()
  @ApiOperation({ summary: 'Check process liveness' })
  @ApiOkResponse({ description: 'Process is live', type: LivenessResponseDto })
  live(): Promise<HealthCheckResult> {
    return this.healthCheckService.check([() => Promise.resolve({ process: { status: 'up' } })]);
  }

  @Get('ready')
  @HealthCheck()
  @ApiOperation({ summary: 'Check API readiness' })
  @ApiOkResponse({
    description: 'PostgreSQL and RabbitMQ are available',
    type: ReadinessResponseDto,
  })
  @ApiServiceUnavailableResponse({
    description: 'PostgreSQL or RabbitMQ is unavailable',
    type: ErrorResponseDto,
  })
  ready(): Promise<HealthCheckResult> {
    return this.healthCheckService.check([
      () => this.prismaHealthIndicator.pingCheck('database', this.prisma),
      () => this.rabbitMQHealthIndicator.isHealthy(),
    ]);
  }
}
