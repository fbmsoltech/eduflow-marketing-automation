import { Inject, Injectable } from '@nestjs/common';
import { Campaign } from '../../../domain/campaigns/campaign.entity';
import { CAMPAIGNS_REPOSITORY, CampaignsRepository } from '../campaigns.repository';

@Injectable()
export class ListCampaignsUseCase {
  constructor(
    @Inject(CAMPAIGNS_REPOSITORY)
    private readonly campaignsRepository: CampaignsRepository,
  ) {}

  async execute(): Promise<Campaign[]> {
    return this.campaignsRepository.list();
  }
}
