import { BadRequestException } from '@nestjs/common';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class PublishOutboxMessagesDto {
  @ApiPropertyOptional({ example: 10, minimum: 1, default: 100 })
  readonly limit?: number;

  private constructor(limit?: number) {
    this.limit = limit;
  }

  static fromBody(body: unknown): PublishOutboxMessagesDto {
    if (body === undefined || body === null) {
      return new PublishOutboxMessagesDto();
    }

    if (typeof body !== 'object' || Array.isArray(body)) {
      throw new BadRequestException('Request body must be an object');
    }

    const limit = (body as Record<string, unknown>)['limit'];

    if (limit === undefined) {
      return new PublishOutboxMessagesDto();
    }

    if (typeof limit !== 'number' || !Number.isInteger(limit) || limit <= 0) {
      throw new BadRequestException('limit must be a positive integer');
    }

    return new PublishOutboxMessagesDto(limit);
  }
}
