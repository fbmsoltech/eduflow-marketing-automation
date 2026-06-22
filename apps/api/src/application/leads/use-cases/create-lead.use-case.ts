import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { CampaignNotFoundError } from '../../campaigns/errors';
import { CAMPAIGNS_REPOSITORY, CampaignsRepository } from '../../campaigns/campaigns.repository';
import { OrganizationNotFoundError } from '../../organizations/errors';
import {
  ORGANIZATIONS_REPOSITORY,
  OrganizationsRepository,
} from '../../organizations/organizations.repository';
import { Lead, LeadMetadata } from '../../../domain/leads/lead.entity';
import { CampaignDoesNotBelongToOrganizationError, LeadEmailAlreadyExistsError } from '../errors';
import { LEADS_REPOSITORY, LeadsRepository } from '../leads.repository';

export interface CreateLeadInput {
  organizationId: string;
  campaignId?: string;
  email: string;
  fullName?: string;
  phone?: string;
  metadata?: LeadMetadata;
}

@Injectable()
export class CreateLeadUseCase {
  constructor(
    @Inject(LEADS_REPOSITORY)
    private readonly leadsRepository: LeadsRepository,
    @Inject(ORGANIZATIONS_REPOSITORY)
    private readonly organizationsRepository: OrganizationsRepository,
    @Inject(CAMPAIGNS_REPOSITORY)
    private readonly campaignsRepository: CampaignsRepository,
  ) {}

  async execute(input: CreateLeadInput): Promise<Lead> {
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

    const normalizedEmail = input.email.trim().toLowerCase();
    const existingLead = await this.leadsRepository.findByOrganizationIdAndEmail(
      input.organizationId,
      normalizedEmail,
    );

    if (existingLead) {
      throw new LeadEmailAlreadyExistsError(normalizedEmail);
    }

    const lead = Lead.create({
      id: randomUUID(),
      organizationId: input.organizationId,
      campaignId: input.campaignId,
      email: normalizedEmail,
      fullName: input.fullName,
      phone: input.phone,
      metadata: input.metadata,
    });

    return this.leadsRepository.create(lead);
  }
}
