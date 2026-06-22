import { BadRequestException } from '@nestjs/common';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  LeadEventPayload,
  LeadEventPayloadValue,
} from '../../../domain/lead-events/lead-event.entity';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class RegisterLeadEventDto {
  @ApiProperty({ example: 'ORGANIZATION_ID', format: 'uuid' })
  readonly organizationId: string;

  @ApiProperty({ example: 'email.clicked' })
  readonly eventType: string;

  @ApiProperty({ example: '2026-06-21T10:30:00.000Z', format: 'date-time', type: String })
  readonly occurredAt: Date;

  @ApiProperty({ example: 'lead-event-001' })
  readonly idempotencyKey: string;

  @ApiPropertyOptional({ example: 'CAMPAIGN_ID', format: 'uuid' })
  readonly campaignId?: string;

  @ApiPropertyOptional({ example: 'LEAD_ID', format: 'uuid' })
  readonly leadId?: string;

  @ApiPropertyOptional({
    example: {
      link: 'https://example.com/edital',
      source: 'email',
    },
    type: 'object',
    additionalProperties: true,
  })
  readonly payload?: LeadEventPayload;

  @ApiPropertyOptional({ example: 'demo-001' })
  readonly correlationId?: string;

  constructor(
    organizationId: string,
    eventType: string,
    occurredAt: Date,
    idempotencyKey: string,
    campaignId?: string,
    leadId?: string,
    payload?: LeadEventPayload,
    correlationId?: string,
  ) {
    this.organizationId = organizationId;
    this.eventType = eventType;
    this.occurredAt = occurredAt;
    this.idempotencyKey = idempotencyKey;
    this.campaignId = campaignId;
    this.leadId = leadId;
    this.payload = payload;
    this.correlationId = correlationId;
  }

  static fromBody(body: unknown): RegisterLeadEventDto {
    if (!this.isRecord(body)) {
      throw new BadRequestException('Request body must be an object');
    }

    const organizationId = body['organizationId'];
    const campaignId = body['campaignId'];
    const leadId = body['leadId'];
    const eventType = body['eventType'];
    const occurredAt = body['occurredAt'];
    const idempotencyKey = body['idempotencyKey'];
    const correlationId = body['correlationId'];
    const payload = body['payload'];

    if (typeof organizationId !== 'string' || !UUID_PATTERN.test(organizationId)) {
      throw new BadRequestException('organizationId must be a valid UUID');
    }

    if (
      campaignId !== undefined &&
      (typeof campaignId !== 'string' || !UUID_PATTERN.test(campaignId))
    ) {
      throw new BadRequestException('campaignId must be a valid UUID');
    }

    if (leadId !== undefined && (typeof leadId !== 'string' || !UUID_PATTERN.test(leadId))) {
      throw new BadRequestException('leadId must be a valid UUID');
    }

    if (typeof eventType !== 'string' || !eventType.trim()) {
      throw new BadRequestException('eventType must be a non-empty string');
    }

    if (typeof occurredAt !== 'string' || Number.isNaN(Date.parse(occurredAt))) {
      throw new BadRequestException('occurredAt must be a valid ISO date');
    }

    if (typeof idempotencyKey !== 'string' || !idempotencyKey.trim()) {
      throw new BadRequestException('idempotencyKey must be a non-empty string');
    }

    if (correlationId !== undefined && typeof correlationId !== 'string') {
      throw new BadRequestException('correlationId must be a string');
    }

    if (payload !== undefined && !this.isLeadEventPayload(payload)) {
      throw new BadRequestException('payload must be an object');
    }

    return new RegisterLeadEventDto(
      organizationId,
      eventType,
      new Date(occurredAt),
      idempotencyKey,
      campaignId,
      leadId,
      payload,
      correlationId,
    );
  }

  private static isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }

  private static isLeadEventPayload(value: unknown): value is LeadEventPayload {
    if (!this.isRecord(value)) {
      return false;
    }

    return Object.values(value).every((item) => this.isLeadEventPayloadValue(item));
  }

  private static isLeadEventPayloadValue(value: unknown): value is LeadEventPayloadValue {
    if (
      value === null ||
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean'
    ) {
      return true;
    }

    if (Array.isArray(value)) {
      return value.every((item) => this.isLeadEventPayloadValue(item));
    }

    return this.isLeadEventPayload(value);
  }
}
