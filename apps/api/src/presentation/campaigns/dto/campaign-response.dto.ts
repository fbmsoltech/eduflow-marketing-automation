import {
  Campaign,
  CampaignMetadata,
  CampaignStatus,
} from '../../../domain/campaigns/campaign.entity';

export class CampaignResponseDto {
  readonly id: string;
  readonly organizationId: string;
  readonly name: string;
  readonly slug: string;
  readonly status: CampaignStatus;
  readonly startsAt?: string;
  readonly endsAt?: string;
  readonly metadata?: CampaignMetadata;
  readonly createdAt: string;
  readonly updatedAt: string;

  private constructor(campaign: Campaign) {
    this.id = campaign.id;
    this.organizationId = campaign.organizationId;
    this.name = campaign.name;
    this.slug = campaign.slug;
    this.status = campaign.status;
    this.startsAt = campaign.startsAt?.toISOString();
    this.endsAt = campaign.endsAt?.toISOString();
    this.metadata = campaign.metadata;
    this.createdAt = campaign.createdAt.toISOString();
    this.updatedAt = campaign.updatedAt.toISOString();
  }

  static fromDomain(campaign: Campaign): CampaignResponseDto {
    return new CampaignResponseDto(campaign);
  }
}
