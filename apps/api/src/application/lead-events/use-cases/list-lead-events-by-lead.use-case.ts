import { Inject, Injectable } from '@nestjs/common';
import { LeadEvent } from '../../../domain/lead-events/lead-event.entity';
import { LeadNotFoundError } from '../../leads/errors';
import { LEADS_REPOSITORY, LeadsRepository } from '../../leads/leads.repository';
import { LEAD_EVENTS_REPOSITORY, LeadEventsRepository } from '../lead-events.repository';

@Injectable()
export class ListLeadEventsByLeadUseCase {
  constructor(
    @Inject(LEAD_EVENTS_REPOSITORY)
    private readonly leadEventsRepository: LeadEventsRepository,
    @Inject(LEADS_REPOSITORY)
    private readonly leadsRepository: LeadsRepository,
  ) {}

  async execute(leadId: string): Promise<LeadEvent[]> {
    const lead = await this.leadsRepository.findById(leadId);

    if (!lead) {
      throw new LeadNotFoundError(leadId);
    }

    return this.leadEventsRepository.listByLeadId(leadId);
  }
}
