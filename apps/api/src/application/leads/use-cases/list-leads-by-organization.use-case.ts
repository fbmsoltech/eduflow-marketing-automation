import { Inject, Injectable } from '@nestjs/common';
import { Lead } from '../../../domain/leads/lead.entity';
import { OrganizationNotFoundError } from '../../organizations/errors';
import {
  ORGANIZATIONS_REPOSITORY,
  OrganizationsRepository,
} from '../../organizations/organizations.repository';
import { LEADS_REPOSITORY, LeadsRepository } from '../leads.repository';

@Injectable()
export class ListLeadsByOrganizationUseCase {
  constructor(
    @Inject(LEADS_REPOSITORY)
    private readonly leadsRepository: LeadsRepository,
    @Inject(ORGANIZATIONS_REPOSITORY)
    private readonly organizationsRepository: OrganizationsRepository,
  ) {}

  async execute(organizationId: string): Promise<Lead[]> {
    const organization = await this.organizationsRepository.findById(organizationId);

    if (!organization) {
      throw new OrganizationNotFoundError(organizationId);
    }

    return this.leadsRepository.listByOrganizationId(organizationId);
  }
}
