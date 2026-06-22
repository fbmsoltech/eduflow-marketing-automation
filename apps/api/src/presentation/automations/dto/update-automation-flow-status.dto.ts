import { BadRequestException } from '@nestjs/common';
import { AutomationFlowStatus } from '../../../domain/automations/automation-types';
import { isRecord } from './automation-dto-validation';

export class UpdateAutomationFlowStatusDto {
  private constructor(readonly status: AutomationFlowStatus) {}

  static fromBody(body: unknown): UpdateAutomationFlowStatusDto {
    if (!isRecord(body)) throw new BadRequestException('Request body must be an object');
    const status = body['status'];
    if (
      typeof status !== 'string' ||
      !Object.values(AutomationFlowStatus).includes(status as AutomationFlowStatus)
    ) {
      throw new BadRequestException('status must be a valid AutomationFlowStatus');
    }
    return new UpdateAutomationFlowStatusDto(status as AutomationFlowStatus);
  }
}
