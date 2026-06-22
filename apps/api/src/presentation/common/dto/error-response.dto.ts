import { ApiProperty } from '@nestjs/swagger';

export class ErrorResponseDto {
  @ApiProperty({ example: 400 })
  readonly statusCode!: number;

  @ApiProperty({ example: 'Request body must be an object' })
  readonly message!: string;

  @ApiProperty({ example: 'Bad Request' })
  readonly error!: string;
}
