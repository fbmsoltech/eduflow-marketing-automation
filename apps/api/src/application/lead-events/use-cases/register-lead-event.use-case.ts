import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { CampaignNotFoundError } from '../../campaigns/errors';
import { CAMPAIGNS_REPOSITORY, CampaignsRepository } from '../../campaigns/campaigns.repository';
import { LeadNotFoundError, CampaignDoesNotBelongToOrganizationError } from '../../leads/errors';
import { LEADS_REPOSITORY, LeadsRepository } from '../../leads/leads.repository';
import { OrganizationNotFoundError } from '../../organizations/errors';
import {
  ORGANIZATIONS_REPOSITORY,
  OrganizationsRepository,
} from '../../organizations/organizations.repository';
import { LeadEvent, LeadEventPayload } from '../../../domain/lead-events/lead-event.entity';
import { LeadDoesNotBelongToCampaignError, LeadDoesNotBelongToOrganizationError } from '../errors';
import { LEAD_EVENTS_REPOSITORY, LeadEventsRepository } from '../lead-events.repository';

export interface RegisterLeadEventInput {
  organizationId: string;
  campaignId?: string;
  leadId?: string;
  eventType: string;
  occurredAt: Date;
  payload?: LeadEventPayload;
  correlationId?: string;
  idempotencyKey: string;
}

@Injectable()
export class RegisterLeadEventUseCase {
  constructor(
    @Inject(LEAD_EVENTS_REPOSITORY)
    private readonly leadEventsRepository: LeadEventsRepository,
    @Inject(ORGANIZATIONS_REPOSITORY)
    private readonly organizationsRepository: OrganizationsRepository,
    @Inject(CAMPAIGNS_REPOSITORY)
    private readonly campaignsRepository: CampaignsRepository,
    @Inject(LEADS_REPOSITORY)
    private readonly leadsRepository: LeadsRepository,
  ) {}

  async execute(input: RegisterLeadEventInput): Promise<LeadEvent> {
    const existingLeadEvent = await this.leadEventsRepository.findByOrganizationIdAndIdempotencyKey(
      input.organizationId,
      input.idempotencyKey,
    );

    if (existingLeadEvent) {
      return existingLeadEvent;
    }

    const organization = await this.organizationsRepository.findById(input.organizationId);

    if (!organization) {
      throw new OrganizationNotFoundError(input.organizationId);
    }

    if (input.campaignId) {
      const campaign = await this.campaignsRepository.findById(input.campaignId);

      if (!campaign) {
        throw new CampaignNotFoundError(input.campaignId);
      }

      if (campaign.organizationId !== input.organizationId) {
        throw new CampaignDoesNotBelongToOrganizationError(input.campaignId, input.organizationId);
      }
    }

    if (input.leadId) {
      const lead = await this.leadsRepository.findById(input.leadId);

      if (!lead) {
        throw new LeadNotFoundError(input.leadId);
      }

      if (lead.organizationId !== input.organizationId) {
        throw new LeadDoesNotBelongToOrganizationError(input.leadId, input.organizationId);
      }

      if (input.campaignId && lead.campaignId && lead.campaignId !== input.campaignId) {
        throw new LeadDoesNotBelongToCampaignError(input.leadId, input.campaignId);
      }
    }

    const leadEvent = LeadEvent.create({
      id: randomUUID(),
      eventId: randomUUID(),
      eventType: input.eventType,
      organizationId: input.organizationId,
      campaignId: input.campaignId,
      leadId: input.leadId,
      occurredAt: input.occurredAt,
      payload: input.payload,
      correlationId: input.correlationId,
      idempotencyKey: input.idempotencyKey,
    });

    return this.leadEventsRepository.create(leadEvent);
  }
}
