import { BadRequestException } from '@nestjs/common';
import { LeadStatus } from '../../../domain/leads/lead.entity';

export class UpdateLeadStatusDto {
  constructor(readonly status: LeadStatus) {}

  static fromBody(body: unknown): UpdateLeadStatusDto {
    if (!this.isRecord(body)) {
      throw new BadRequestException('Request body must be an object');
    }

    const status = body['status'];

    if (typeof status !== 'string' || !this.isLeadStatus(status)) {
      throw new BadRequestException('status must be a valid lead status');
    }

    return new UpdateLeadStatusDto(status);
  }

  private static isLeadStatus(value: string): value is LeadStatus {
    return Object.values(LeadStatus).includes(value as LeadStatus);
  }

  private static isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }
}
