export type LeadEventPayloadValue =
  | string
  | number
  | boolean
  | null
  | LeadEventPayload
  | LeadEventPayloadValue[];

export interface LeadEventPayload {
  [key: string]: LeadEventPayloadValue;
}

export interface LeadEventProps {
  id: string;
  eventId: string;
  eventType: string;
  organizationId: string;
  campaignId?: string;
  leadId?: string;
  occurredAt: Date;
  payload: LeadEventPayload;
  correlationId?: string;
  idempotencyKey: string;
  createdAt: Date;
}

export interface CreateLeadEventProps {
  id: string;
  eventId: string;
  eventType: string;
  organizationId: string;
  campaignId?: string;
  leadId?: string;
  occurredAt: Date;
  payload?: LeadEventPayload;
  correlationId?: string;
  idempotencyKey: string;
  createdAt?: Date;
}

export class EmptyLeadEventTypeError extends Error {
  constructor() {
    super('Lead event type cannot be empty');
    this.name = 'EmptyLeadEventTypeError';
  }
}

export class EmptyLeadEventIdempotencyKeyError extends Error {
  constructor() {
    super('Lead event idempotency key cannot be empty');
    this.name = 'EmptyLeadEventIdempotencyKeyError';
  }
}

export class LeadEvent {
  private constructor(private readonly props: LeadEventProps) {}

  static create(props: CreateLeadEventProps): LeadEvent {
    const eventType = props.eventType.trim();
    const idempotencyKey = props.idempotencyKey.trim();

    if (!eventType) {
      throw new EmptyLeadEventTypeError();
    }

    if (!idempotencyKey) {
      throw new EmptyLeadEventIdempotencyKeyError();
    }

    return new LeadEvent({
      id: props.id,
      eventId: props.eventId,
      eventType,
      organizationId: props.organizationId,
      campaignId: props.campaignId,
      leadId: props.leadId,
      occurredAt: props.occurredAt,
      payload: props.payload ?? {},
      correlationId: props.correlationId?.trim() || undefined,
      idempotencyKey,
      createdAt: props.createdAt ?? new Date(),
    });
  }

  static restore(props: LeadEventProps): LeadEvent {
    return new LeadEvent(props);
  }

  get id(): string {
    return this.props.id;
  }

  get eventId(): string {
    return this.props.eventId;
  }

  get eventType(): string {
    return this.props.eventType;
  }

  get organizationId(): string {
    return this.props.organizationId;
  }

  get campaignId(): string | undefined {
    return this.props.campaignId;
  }

  get leadId(): string | undefined {
    return this.props.leadId;
  }

  get occurredAt(): Date {
    return this.props.occurredAt;
  }

  get payload(): LeadEventPayload {
    return this.props.payload;
  }

  get correlationId(): string | undefined {
    return this.props.correlationId;
  }

  get idempotencyKey(): string {
    return this.props.idempotencyKey;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  toJSON(): LeadEventProps {
    return { ...this.props };
  }
}
