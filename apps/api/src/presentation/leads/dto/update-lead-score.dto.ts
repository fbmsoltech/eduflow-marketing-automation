import { BadRequestException } from '@nestjs/common';

export class UpdateLeadScoreDto {
  constructor(readonly score: number) {}

  static fromBody(body: unknown): UpdateLeadScoreDto {
    if (!this.isRecord(body)) {
      throw new BadRequestException('Request body must be an object');
    }

    const score = body['score'];

    if (typeof score !== 'number' || !Number.isInteger(score)) {
      throw new BadRequestException('score must be an integer');
    }

    if (score < 0) {
      throw new BadRequestException('score must be greater than or equal to 0');
    }

    return new UpdateLeadScoreDto(score);
  }

  private static isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }
}
