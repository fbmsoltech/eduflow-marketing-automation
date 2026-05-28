import { Campaign, CampaignStatus } from '../../domain/campaigns/campaign.entity';

export const CAMPAIGNS_REPOSITORY = Symbol('CAMPAIGNS_REPOSITORY');

export interface CampaignsRepository {
  create(campaign: Campaign): Promise<Campaign>;
  findById(id: string): Promise<Campaign | null>;
  findByOrganizationIdAndSlug(organizationId: string, slug: string): Promise<Campaign | null>;
  list(): Promise<Campaign[]>;
  listByOrganizationId(organizationId: string): Promise<Campaign[]>;
  updateStatus(id: string, status: CampaignStatus): Promise<Campaign | null>;
}
