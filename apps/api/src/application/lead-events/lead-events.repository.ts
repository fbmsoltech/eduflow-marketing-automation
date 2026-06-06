import { LeadEvent } from '../../domain/lead-events/lead-event.entity';
import { OutboxMessage } from '../../domain/outbox/outbox-message.entity';

export const LEAD_EVENTS_REPOSITORY = Symbol('LEAD_EVENTS_REPOSITORY');

export interface LeadEventsRepository {
  create(leadEvent: LeadEvent): Promise<LeadEvent>;
  createWithOutboxMessage(leadEvent: LeadEvent, outboxMessage: OutboxMessage): Promise<LeadEvent>;
  findById(id: string): Promise<LeadEvent | null>;
  findByOrganizationIdAndIdempotencyKey(
    organizationId: string,
    idempotencyKey: string,
  ): Promise<LeadEvent | null>;
  list(): Promise<LeadEvent[]>;
  listByOrganizationId(organizationId: string): Promise<LeadEvent[]>;
  listByCampaignId(campaignId: string): Promise<LeadEvent[]>;
  listByLeadId(leadId: string): Promise<LeadEvent[]>;
}
