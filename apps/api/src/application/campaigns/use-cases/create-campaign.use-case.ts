import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { Campaign, CampaignMetadata } from '../../../domain/campaigns/campaign.entity';
import { OrganizationNotFoundError } from '../../organizations/errors';
import {
  ORGANIZATIONS_REPOSITORY,
  OrganizationsRepository,
} from '../../organizations/organizations.repository';
import { CampaignSlugAlreadyExistsError } from '../errors';
import { CAMPAIGNS_REPOSITORY, CampaignsRepository } from '../campaigns.repository';

export interface CreateCampaignInput {
  organizationId: string;
  name: string;
  slug: string;
  startsAt?: Date;
  endsAt?: Date;
  metadata?: CampaignMetadata;
}

@Injectable()
export class CreateCampaignUseCase {
  constructor(
    @Inject(CAMPAIGNS_REPOSITORY)
    private readonly campaignsRepository: CampaignsRepository,
    @Inject(ORGANIZATIONS_REPOSITORY)
    private readonly organizationsRepository: OrganizationsRepository,
  ) {}

  async execute(input: CreateCampaignInput): Promise<Campaign> {
    const organization = await this.organizationsRepository.findById(input.organizationId);

    if (!organization) {
      throw new OrganizationNotFoundError(input.organizationId);
    }

    const existingCampaign = await this.campaignsRepository.findByOrganizationIdAndSlug(
      input.organizationId,
      input.slug,
    );

    if (existingCampaign) {
      throw new CampaignSlugAlreadyExistsError(input.slug);
    }

    const campaign = Campaign.create({
      id: randomUUID(),
      organizationId: input.organizationId,
      name: input.name,
      slug: input.slug,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      metadata: input.metadata,
    });

    return this.campaignsRepository.create(campaign);
  }
}
