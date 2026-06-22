import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  Campaign,
  CampaignMetadata,
  CampaignStatus,
} from '../../../domain/campaigns/campaign.entity';

export class CampaignResponseDto {
  @ApiProperty({ example: 'd6ee8daa-931d-47c0-96f5-dc7da3be4569', format: 'uuid' })
  readonly id: string;

  @ApiProperty({ example: '9a0f59cc-0d6a-4da2-af5a-b4e37f53e1b7', format: 'uuid' })
  readonly organizationId: string;

  @ApiProperty({ example: 'Selection Process 2026' })
  readonly name: string;

  @ApiProperty({ example: 'selection-process-2026' })
  readonly slug: string;

  @ApiProperty({ enum: CampaignStatus, example: CampaignStatus.DRAFT })
  readonly status: CampaignStatus;

  @ApiPropertyOptional({ example: '2026-03-01T00:00:00.000Z', format: 'date-time' })
  readonly startsAt?: string;

  @ApiPropertyOptional({ example: '2026-03-20T23:59:59.000Z', format: 'date-time' })
  readonly endsAt?: string;

  @ApiPropertyOptional({
    example: { channel: 'instagram' },
    type: 'object',
    additionalProperties: true,
  })
  readonly metadata?: CampaignMetadata;

  @ApiProperty({ example: '2026-02-20T12:00:00.000Z', format: 'date-time' })
  readonly createdAt: string;

  @ApiProperty({ example: '2026-02-20T12:00:00.000Z', format: 'date-time' })
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
