import { BadRequestException } from '@nestjs/common';
import { CampaignStatus } from '../../../domain/campaigns/campaign.entity';

export class UpdateCampaignStatusDto {
  constructor(readonly status: CampaignStatus) {}

  static fromBody(body: unknown): UpdateCampaignStatusDto {
    if (!this.isRecord(body)) {
      throw new BadRequestException('Request body must be an object');
    }

    const status = body['status'];

    if (typeof status !== 'string' || !this.isCampaignStatus(status)) {
      throw new BadRequestException('status must be a valid campaign status');
    }

    return new UpdateCampaignStatusDto(status);
  }

  private static isCampaignStatus(value: string): value is CampaignStatus {
    return Object.values(CampaignStatus).includes(value as CampaignStatus);
  }

  private static isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }
}
