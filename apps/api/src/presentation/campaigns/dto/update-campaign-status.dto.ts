import { BadRequestException } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { CampaignStatus } from '../../../domain/campaigns/campaign.entity';

export class UpdateCampaignStatusDto {
  @ApiProperty({ enum: CampaignStatus, example: CampaignStatus.ACTIVE })
  readonly status: CampaignStatus;

  constructor(status: CampaignStatus) {
    this.status = status;
  }

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
