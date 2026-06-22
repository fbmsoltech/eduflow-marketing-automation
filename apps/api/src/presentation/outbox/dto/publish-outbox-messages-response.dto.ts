import { ApiProperty } from '@nestjs/swagger';

export class PublishOutboxMessagesResponseDto {
  @ApiProperty({ example: 1 })
  readonly processed!: number;

  @ApiProperty({ example: 1 })
  readonly published!: number;

  @ApiProperty({ example: 0 })
  readonly failed!: number;
}
