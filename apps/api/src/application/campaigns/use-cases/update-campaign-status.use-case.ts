import { Inject, Injectable } from '@nestjs/common';
import { Campaign, CampaignStatus } from '../../../domain/campaigns/campaign.entity';
import { CAMPAIGNS_REPOSITORY, CampaignsRepository } from '../campaigns.repository';
import { CampaignNotFoundError } from '../errors';

export interface UpdateCampaignStatusInput {
  id: string;
  status: CampaignStatus;
}

@Injectable()
export class UpdateCampaignStatusUseCase {
  constructor(
    @Inject(CAMPAIGNS_REPOSITORY)
    private readonly campaignsRepository: CampaignsRepository,
  ) {}

  async execute(input: UpdateCampaignStatusInput): Promise<Campaign> {
    const campaign = await this.campaignsRepository.updateStatus(input.id, input.status);

    if (!campaign) {
      throw new CampaignNotFoundError(input.id);
    }

    return campaign;
  }
}
