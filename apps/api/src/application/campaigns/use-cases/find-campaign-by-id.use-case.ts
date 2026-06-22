import { Inject, Injectable } from '@nestjs/common';
import { Campaign } from '../../../domain/campaigns/campaign.entity';
import { CAMPAIGNS_REPOSITORY, CampaignsRepository } from '../campaigns.repository';
import { CampaignNotFoundError } from '../errors';

@Injectable()
export class FindCampaignByIdUseCase {
  constructor(
    @Inject(CAMPAIGNS_REPOSITORY)
    private readonly campaignsRepository: CampaignsRepository,
  ) {}

  async execute(id: string): Promise<Campaign> {
    const campaign = await this.campaignsRepository.findById(id);

    if (!campaign) {
      throw new CampaignNotFoundError(id);
    }

    return campaign;
  }
}
