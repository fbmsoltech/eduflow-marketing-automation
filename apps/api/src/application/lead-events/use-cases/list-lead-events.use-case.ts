import { Inject, Injectable } from '@nestjs/common';
import { LeadEvent } from '../../../domain/lead-events/lead-event.entity';
import { LEAD_EVENTS_REPOSITORY, LeadEventsRepository } from '../lead-events.repository';

@Injectable()
export class ListLeadEventsUseCase {
  constructor(
    @Inject(LEAD_EVENTS_REPOSITORY)
    private readonly leadEventsRepository: LeadEventsRepository,
  ) {}

  execute(): Promise<LeadEvent[]> {
    return this.leadEventsRepository.list();
  }
}
