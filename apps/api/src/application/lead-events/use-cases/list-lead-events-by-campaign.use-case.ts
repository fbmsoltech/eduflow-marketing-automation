import { Inject, Injectable } from '@nestjs/common';
import { LeadEvent } from '../../../domain/lead-events/lead-event.entity';
import { CampaignNotFoundError } from '../../campaigns/errors';
import { CAMPAIGNS_REPOSITORY, CampaignsRepository } from '../../campaigns/campaigns.repository';
import { LEAD_EVENTS_REPOSITORY, LeadEventsRepository } from '../lead-events.repository';

@Injectable()
export class ListLeadEventsByCampaignUseCase {
  constructor(
    @Inject(LEAD_EVENTS_REPOSITORY)
    private readonly leadEventsRepository: LeadEventsRepository,
    @Inject(CAMPAIGNS_REPOSITORY)
    private readonly campaignsRepository: CampaignsRepository,
  ) {}

  async execute(campaignId: string): Promise<LeadEvent[]> {
    const campaign = await this.campaignsRepository.findById(campaignId);

    if (!campaign) {
      throw new CampaignNotFoundError(campaignId);
    }

    return this.leadEventsRepository.listByCampaignId(campaignId);
  }
}
