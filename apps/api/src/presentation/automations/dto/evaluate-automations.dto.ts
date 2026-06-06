import { BadRequestException } from '@nestjs/common';
import { isRecord, UUID_PATTERN } from './automation-dto-validation';

export class EvaluateAutomationsDto {
  private constructor(readonly leadEventId: string) {}

  static fromBody(body: unknown): EvaluateAutomationsDto {
    if (!isRecord(body)) throw new BadRequestException('Request body must be an object');
    const leadEventId = body['leadEventId'];
    if (typeof leadEventId !== 'string' || !UUID_PATTERN.test(leadEventId)) {
      throw new BadRequestException('leadEventId must be a valid UUID');
    }
    return new EvaluateAutomationsDto(leadEventId);
  }
}
