import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LeadEvent, LeadEventPayload } from '../../../domain/lead-events/lead-event.entity';

export class LeadEventResponseDto {
  @ApiProperty({ example: '1ef567c6-2a55-4f0b-892c-155d073729b1', format: 'uuid' })
  readonly id: string;

  @ApiProperty({ example: 'c99f01bf-6a0d-4fd5-903d-14996600a455', format: 'uuid' })
  readonly eventId: string;

  @ApiProperty({ example: 'email.clicked' })
  readonly eventType: string;

  @ApiProperty({ example: '9a0f59cc-0d6a-4da2-af5a-b4e37f53e1b7', format: 'uuid' })
  readonly organizationId: string;

  @ApiPropertyOptional({ example: 'd6ee8daa-931d-47c0-96f5-dc7da3be4569', format: 'uuid' })
  readonly campaignId?: string;

  @ApiPropertyOptional({ example: '11fc9f71-feba-4fe4-a09c-04fc96577a8d', format: 'uuid' })
  readonly leadId?: string;

  @ApiProperty({ example: '2026-06-21T10:30:00.000Z', format: 'date-time' })
  readonly occurredAt: string;

  @ApiProperty({
    example: {
      link: 'https://example.com/edital',
      source: 'email',
    },
    type: 'object',
    additionalProperties: true,
  })
  readonly payload: LeadEventPayload;

  @ApiPropertyOptional({ example: 'demo-001' })
  readonly correlationId?: string;

  @ApiProperty({ example: 'lead-event-001' })
  readonly idempotencyKey: string;

  @ApiProperty({ example: '2026-06-21T10:30:00.000Z', format: 'date-time' })
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
