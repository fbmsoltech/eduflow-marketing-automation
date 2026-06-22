import { ApiProperty } from '@nestjs/swagger';

export class HealthResponseDto {
  @ApiProperty({ example: 'ok' })
  readonly status!: 'ok';

  @ApiProperty({ example: 'eduflow-api' })
  readonly service!: 'eduflow-api';
}
