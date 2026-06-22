import { ApiProperty } from '@nestjs/swagger';

class HealthIndicatorStatusDto {
  @ApiProperty({ example: 'up' })
  readonly status!: string;
}

export class LivenessResponseDto {
  @ApiProperty({ example: 'ok' })
  readonly status!: string;

  @ApiProperty({
    example: {
      process: {
        status: 'up',
      },
    },
  })
  readonly details!: Record<string, HealthIndicatorStatusDto>;
}

export class ReadinessResponseDto {
  @ApiProperty({ example: 'ok' })
  readonly status!: string;

  @ApiProperty({
    example: {
      database: {
        status: 'up',
      },
      rabbitmq: {
        status: 'up',
      },
    },
  })
  readonly details!: Record<string, HealthIndicatorStatusDto>;
}
