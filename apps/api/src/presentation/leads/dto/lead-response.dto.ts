import { Lead, LeadMetadata, LeadStatus } from '../../../domain/leads/lead.entity';

export class LeadResponseDto {
  readonly id: string;
  readonly organizationId: string;
  readonly campaignId?: string;
  readonly email: string;
  readonly fullName?: string;
  readonly phone?: string;
  readonly status: LeadStatus;
  readonly score: number;
  readonly metadata?: LeadMetadata;
  readonly createdAt: string;
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
