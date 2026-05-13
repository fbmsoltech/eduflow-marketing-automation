import { Controller, Get } from '@nestjs/common';
import { HealthResponseDto } from './dto/health-response.dto';

@Controller('health')
export class HealthController {
  @Get()
  getHealth(): HealthResponseDto {
    return {
      status: 'ok',
      service: 'eduflow-api',
    };
  }
}
