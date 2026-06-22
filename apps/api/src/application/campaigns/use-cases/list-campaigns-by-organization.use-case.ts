import { Inject, Injectable } from '@nestjs/common';
import { Campaign } from '../../../domain/campaigns/campaign.entity';
import { OrganizationNotFoundError } from '../../organizations/errors';
import {
  ORGANIZATIONS_REPOSITORY,
  OrganizationsRepository,
} from '../../organizations/organizations.repository';
import { CAMPAIGNS_REPOSITORY, CampaignsRepository } from '../campaigns.repository';

@Injectable()
export class ListCampaignsByOrganizationUseCase {
  constructor(
    @Inject(CAMPAIGNS_REPOSITORY)
    private readonly campaignsRepository: CampaignsRepository,
    @Inject(ORGANIZATIONS_REPOSITORY)
    private readonly organizationsRepository: OrganizationsRepository,
  ) {}

  async execute(organizationId: string): Promise<Campaign[]> {
    const organization = await this.organizationsRepository.findById(organizationId);

    if (!organization) {
      throw new OrganizationNotFoundError(organizationId);
    }

    return this.campaignsRepository.listByOrganizationId(organizationId);
  }
}
