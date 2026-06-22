export type OutboxMessageStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'PUBLISHED'
  | 'FAILED'
  | 'DEAD_LETTERED';

export type OutboxMessagePayloadValue =
  | string
  | number
  | boolean
  | null
  | OutboxMessagePayload
  | OutboxMessagePayloadValue[];

export interface OutboxMessagePayload {
  [key: string]: OutboxMessagePayloadValue;
}

export interface OutboxMessageProps {
  id: string;
  organizationId?: string;
  aggregateId: string;
  aggregateType: string;
  eventType: string;
  payload: OutboxMessagePayload;
  status: OutboxMessageStatus;
  attempts: number;
  occurredAt: Date;
  publishedAt?: Date;
  lastError?: string;
  correlationId?: string;
  idempotencyKey?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateOutboxMessageProps {
  id: string;
  organizationId?: string;
  aggregateId: string;
  aggregateType: string;
  eventType: string;
  payload: OutboxMessagePayload;
  occurredAt: Date;
  correlationId?: string;
  idempotencyKey?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export class EmptyOutboxAggregateTypeError extends Error {
  constructor() {
    super('Outbox aggregate type cannot be empty');
    this.name = 'EmptyOutboxAggregateTypeError';
  }
}

export class EmptyOutboxAggregateIdError extends Error {
  constructor() {
    super('Outbox aggregate id cannot be empty');
    this.name = 'EmptyOutboxAggregateIdError';
  }
}

export class EmptyOutboxEventTypeError extends Error {
  constructor() {
    super('Outbox event type cannot be empty');
    this.name = 'EmptyOutboxEventTypeError';
  }
}

export class OutboxMessage {
  private constructor(private readonly props: OutboxMessageProps) {}

  static create(props: CreateOutboxMessageProps): OutboxMessage {
    const aggregateType = props.aggregateType.trim();
    const aggregateId = props.aggregateId.trim();
    const eventType = props.eventType.trim();

    if (!aggregateType) {
      throw new EmptyOutboxAggregateTypeError();
    }

    if (!aggregateId) {
      throw new EmptyOutboxAggregateIdError();
    }

    if (!eventType) {
      throw new EmptyOutboxEventTypeError();
    }

    const now = new Date();

    return new OutboxMessage({
      id: props.id,
      organizationId: props.organizationId,
      aggregateId,
      aggregateType,
      eventType,
      payload: props.payload,
      status: 'PENDING',
      attempts: 0,
      occurredAt: props.occurredAt,
      correlationId: props.correlationId?.trim() || undefined,
      idempotencyKey: props.idempotencyKey?.trim() || undefined,
      createdAt: props.createdAt ?? now,
      updatedAt: props.updatedAt ?? now,
    });
  }

  static restore(props: OutboxMessageProps): OutboxMessage {
    return new OutboxMessage(props);
  }

  get id(): string {
    return this.props.id;
  }

  get organizationId(): string | undefined {
    return this.props.organizationId;
  }

  get aggregateId(): string {
    return this.props.aggregateId;
  }

  get aggregateType(): string {
    return this.props.aggregateType;
  }

  get eventType(): string {
    return this.props.eventType;
  }

  get payload(): OutboxMessagePayload {
    return this.props.payload;
  }

  get status(): OutboxMessageStatus {
    return this.props.status;
  }

  get attempts(): number {
    return this.props.attempts;
  }

  get occurredAt(): Date {
    return this.props.occurredAt;
  }

  get publishedAt(): Date | undefined {
    return this.props.publishedAt;
  }

  get lastError(): string | undefined {
    return this.props.lastError;
  }

  get correlationId(): string | undefined {
    return this.props.correlationId;
  }

  get idempotencyKey(): string | undefined {
    return this.props.idempotencyKey;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  toJSON(): OutboxMessageProps {
    return { ...this.props };
  }
}
