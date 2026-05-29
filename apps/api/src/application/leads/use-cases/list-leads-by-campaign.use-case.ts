import { Inject, Injectable } from '@nestjs/common';
import { Lead } from '../../../domain/leads/lead.entity';
import { CampaignNotFoundError } from '../../campaigns/errors';
import { CAMPAIGNS_REPOSITORY, CampaignsRepository } from '../../campaigns/campaigns.repository';
import { LEADS_REPOSITORY, LeadsRepository } from '../leads.repository';

@Injectable()
export class ListLeadsByCampaignUseCase {
  constructor(
    @Inject(LEADS_REPOSITORY)
    private readonly leadsRepository: LeadsRepository,
    @Inject(CAMPAIGNS_REPOSITORY)
    private readonly campaignsRepository: CampaignsRepository,
  ) {}

  async execute(campaignId: string): Promise<Lead[]> {
    const campaign = await this.campaignsRepository.findById(campaignId);

    if (!campaign) {
      throw new CampaignNotFoundError(campaignId);
    }

    return this.leadsRepository.listByCampaignId(campaignId);
  }
}
