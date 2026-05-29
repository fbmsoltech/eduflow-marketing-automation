import { Inject, Injectable } from '@nestjs/common';
import { LeadEvent } from '../../../domain/lead-events/lead-event.entity';
import { OrganizationNotFoundError } from '../../organizations/errors';
import {
  ORGANIZATIONS_REPOSITORY,
  OrganizationsRepository,
} from '../../organizations/organizations.repository';
import { LEAD_EVENTS_REPOSITORY, LeadEventsRepository } from '../lead-events.repository';

@Injectable()
export class ListLeadEventsByOrganizationUseCase {
  constructor(
    @Inject(LEAD_EVENTS_REPOSITORY)
    private readonly leadEventsRepository: LeadEventsRepository,
    @Inject(ORGANIZATIONS_REPOSITORY)
    private readonly organizationsRepository: OrganizationsRepository,
  ) {}

  async execute(organizationId: string): Promise<LeadEvent[]> {
    const organization = await this.organizationsRepository.findById(organizationId);

    if (!organization) {
      throw new OrganizationNotFoundError(organizationId);
    }

    return this.leadEventsRepository.listByOrganizationId(organizationId);
  }
}
