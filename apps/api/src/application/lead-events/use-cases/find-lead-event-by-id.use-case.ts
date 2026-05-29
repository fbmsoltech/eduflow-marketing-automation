import { Inject, Injectable } from '@nestjs/common';
import { LeadEvent } from '../../../domain/lead-events/lead-event.entity';
import { LeadEventNotFoundError } from '../errors';
import { LEAD_EVENTS_REPOSITORY, LeadEventsRepository } from '../lead-events.repository';

@Injectable()
export class FindLeadEventByIdUseCase {
  constructor(
    @Inject(LEAD_EVENTS_REPOSITORY)
    private readonly leadEventsRepository: LeadEventsRepository,
  ) {}

  async execute(id: string): Promise<LeadEvent> {
    const leadEvent = await this.leadEventsRepository.findById(id);

    if (!leadEvent) {
      throw new LeadEventNotFoundError(id);
    }

    return leadEvent;
  }
}
