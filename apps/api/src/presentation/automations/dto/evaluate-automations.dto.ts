import { BadRequestException } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { isRecord, UUID_PATTERN } from './automation-dto-validation';

export class EvaluateAutomationsDto {
  @ApiProperty({ example: 'LEAD_EVENT_ID', format: 'uuid' })
  readonly leadEventId: string;

  private constructor(leadEventId: string) {
    this.leadEventId = leadEventId;
  }

  static fromBody(body: unknown): EvaluateAutomationsDto {
    if (!isRecord(body)) throw new BadRequestException('Request body must be an object');
    const leadEventId = body['leadEventId'];
    if (typeof leadEventId !== 'string' || !UUID_PATTERN.test(leadEventId)) {
      throw new BadRequestException('leadEventId must be a valid UUID');
    }
    return new EvaluateAutomationsDto(leadEventId);
  }
}
