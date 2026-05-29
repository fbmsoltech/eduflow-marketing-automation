import { LeadEvent, LeadEventPayload } from '../../../domain/lead-events/lead-event.entity';

export class LeadEventResponseDto {
  readonly id: string;
  readonly eventId: string;
  readonly eventType: string;
  readonly organizationId: string;
  readonly campaignId?: string;
  readonly leadId?: string;
  readonly occurredAt: string;
  readonly payload: LeadEventPayload;
  readonly correlationId?: string;
  readonly idempotencyKey: string;
  readonly createdAt: string;

  private constructor(leadEvent: LeadEvent) {
    this.id = leadEvent.id;
    this.eventId = leadEvent.eventId;
    this.eventType = leadEvent.eventType;
    this.organizationId = leadEvent.organizationId;
    this.campaignId = leadEvent.campaignId;
    this.leadId = leadEvent.leadId;
    this.occurredAt = leadEvent.occurredAt.toISOString();
    this.payload = leadEvent.payload;
    this.correlationId = leadEvent.correlationId;
    this.idempotencyKey = leadEvent.idempotencyKey;
    this.createdAt = leadEvent.createdAt.toISOString();
  }

  static fromDomain(leadEvent: LeadEvent): LeadEventResponseDto {
    return new LeadEventResponseDto(leadEvent);
  }
}
