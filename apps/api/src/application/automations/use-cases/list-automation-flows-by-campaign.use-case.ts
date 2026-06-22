import { Inject, Injectable } from '@nestjs/common';
import { AutomationFlow } from '../../../domain/automations/automation-flow.entity';
import { CampaignNotFoundError } from '../../campaigns/errors';
import { CAMPAIGNS_REPOSITORY, CampaignsRepository } from '../../campaigns/campaigns.repository';
import { AUTOMATIONS_REPOSITORY, AutomationsRepository } from '../automations.repository';

@Injectable()
export class ListAutomationFlowsByCampaignUseCase {
  constructor(
    @Inject(AUTOMATIONS_REPOSITORY)
    private readonly automationsRepository: AutomationsRepository,
    @Inject(CAMPAIGNS_REPOSITORY)
    private readonly campaignsRepository: CampaignsRepository,
  ) {}

  async execute(campaignId: string): Promise<AutomationFlow[]> {
    if (!(await this.campaignsRepository.findById(campaignId))) {
      throw new CampaignNotFoundError(campaignId);
    }

    return this.automationsRepository.listByCampaignId(campaignId);
  }
}
