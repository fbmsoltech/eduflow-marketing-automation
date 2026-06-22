import { BadRequestException } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { AutomationFlowStatus } from '../../../domain/automations/automation-types';
import { isRecord } from './automation-dto-validation';

export class UpdateAutomationFlowStatusDto {
  @ApiProperty({ enum: AutomationFlowStatus, example: AutomationFlowStatus.ACTIVE })
  readonly status: AutomationFlowStatus;

  private constructor(status: AutomationFlowStatus) {
    this.status = status;
  }

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
