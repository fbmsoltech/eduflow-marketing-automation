import { Inject, Injectable } from '@nestjs/common';
import { LeadEvent } from '../../../domain/lead-events/lead-event.entity';
import { CAMPAIGNS_REPOSITORY, CampaignsRepository } from '../../campaigns/campaigns.repository';
import { LEADS_REPOSITORY, LeadsRepository } from '../../leads/leads.repository';
import {
  ORGANIZATIONS_REPOSITORY,
  OrganizationsRepository,
} from '../../organizations/organizations.repository';

@Injectable()
export class AutomationFieldResolverService {
  constructor(
    @Inject(LEADS_REPOSITORY)
    private readonly leadsRepository: LeadsRepository,
    @Inject(CAMPAIGNS_REPOSITORY)
    private readonly campaignsRepository: CampaignsRepository,
    @Inject(ORGANIZATIONS_REPOSITORY)
    private readonly organizationsRepository: OrganizationsRepository,
  ) {}

  async resolve(fieldPath: string, event: LeadEvent): Promise<unknown> {
    if (fieldPath === 'event.eventType') return event.eventType;
    if (fieldPath === 'event.occurredAt') return event.occurredAt;

    if (fieldPath.startsWith('event.payload.')) {
      return this.resolveObjectPath(event.payload, fieldPath.slice('event.payload.'.length));
    }

    if (fieldPath.startsWith('lead.') && event.leadId) {
      const lead = await this.leadsRepository.findById(event.leadId);
      if (!lead) return undefined;
      if (fieldPath === 'lead.email') return lead.email;
      if (fieldPath === 'lead.score') return lead.score;
      if (fieldPath === 'lead.status') return lead.status;
    }

    if (fieldPath === 'campaign.slug' && event.campaignId) {
      return (await this.campaignsRepository.findById(event.campaignId))?.slug;
    }

    if (fieldPath === 'organization.slug') {
      return (await this.organizationsRepository.findById(event.organizationId))?.slug;
    }

    return undefined;
  }

  private resolveObjectPath(value: unknown, path: string): unknown {
    return path.split('.').reduce<unknown>((current, key) => {
      if (typeof current !== 'object' || current === null || Array.isArray(current)) {
        return undefined;
      }

      return (current as Record<string, unknown>)[key];
    }, value);
  }
}
