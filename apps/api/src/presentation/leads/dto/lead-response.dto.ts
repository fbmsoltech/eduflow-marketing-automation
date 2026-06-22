import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Lead, LeadMetadata, LeadStatus } from '../../../domain/leads/lead.entity';

export class LeadResponseDto {
  @ApiProperty({ example: '11fc9f71-feba-4fe4-a09c-04fc96577a8d', format: 'uuid' })
  readonly id: string;

  @ApiProperty({ example: '9a0f59cc-0d6a-4da2-af5a-b4e37f53e1b7', format: 'uuid' })
  readonly organizationId: string;

  @ApiPropertyOptional({ example: 'd6ee8daa-931d-47c0-96f5-dc7da3be4569', format: 'uuid' })
  readonly campaignId?: string;

  @ApiProperty({ example: 'ana@example.com', format: 'email' })
  readonly email: string;

  @ApiPropertyOptional({ example: 'Ana Silva' })
  readonly fullName?: string;

  @ApiPropertyOptional({ example: '+5511999999999' })
  readonly phone?: string;

  @ApiProperty({ enum: LeadStatus, example: LeadStatus.NEW })
  readonly status: LeadStatus;

  @ApiProperty({ example: 0, minimum: 0 })
  readonly score: number;

  @ApiPropertyOptional({
    example: { source: 'instagram' },
    type: 'object',
    additionalProperties: true,
  })
  readonly metadata?: LeadMetadata;

  @ApiProperty({ example: '2026-06-21T10:00:00.000Z', format: 'date-time' })
  readonly createdAt: string;

  @ApiProperty({ example: '2026-06-21T10:00:00.000Z', format: 'date-time' })
  readonly updatedAt: string;

  private constructor(lead: Lead) {
    this.id = lead.id;
    this.organizationId = lead.organizationId;
    this.campaignId = lead.campaignId;
    this.email = lead.email;
    this.fullName = lead.fullName;
    this.phone = lead.phone;
    this.status = lead.status;
    this.score = lead.score;
    this.metadata = lead.metadata;
    this.createdAt = lead.createdAt.toISOString();
    this.updatedAt = lead.updatedAt.toISOString();
  }

  static fromDomain(lead: Lead): LeadResponseDto {
    return new LeadResponseDto(lead);
  }
}
