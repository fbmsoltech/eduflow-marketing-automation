import { Controller, Get, Res } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiProduces, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { MetricsService } from './metrics.service';

@ApiTags('Health')
@Controller('metrics')
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get()
  @ApiOperation({ summary: 'Get Prometheus metrics' })
  @ApiProduces('text/plain')
  @ApiOkResponse({
    description: 'Prometheus metrics in text exposition format',
    schema: {
      type: 'string',
      example: 'eduflow_outbox_pending_total 1',
    },
  })
  async getMetrics(@Res({ passthrough: true }) response: Response): Promise<string> {
    response.setHeader('content-type', this.metricsService.contentType);
    return this.metricsService.render();
  }
}
