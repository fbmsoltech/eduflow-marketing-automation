export type DeadLetterMessageStatus = 'PENDING' | 'REPROCESSED' | 'IGNORED';

export type DeadLetterJsonValue =
  | string
  | number
  | boolean
  | null
  | DeadLetterJsonObject
  | DeadLetterJsonValue[];

export interface DeadLetterJsonObject {
  [key: string]: DeadLetterJsonValue;
}

export interface DeadLetterMessageProps {
  id: string;
  organizationId?: string;
  outboxMessageId?: string;
  eventType: string;
  payload: DeadLetterJsonObject;
  reason: string;
  errorDetails?: DeadLetterJsonObject;
  status: DeadLetterMessageStatus;
  failedAt: Date;
  reprocessedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateDeadLetterMessageProps {
  id: string;
  organizationId?: string;
  outboxMessageId?: string;
  eventType: string;
  payload: DeadLetterJsonObject;
  reason: string;
  errorDetails?: DeadLetterJsonObject;
  failedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export class DeadLetterMessage {
  private constructor(private readonly props: DeadLetterMessageProps) {}

  static create(props: CreateDeadLetterMessageProps): DeadLetterMessage {
    const eventType = props.eventType.trim();
    const reason = props.reason.trim();

    if (!eventType) throw new Error('Dead letter event type cannot be empty');
    if (!reason) throw new Error('Dead letter reason cannot be empty');

    const now = new Date();
    return new DeadLetterMessage({
      ...props,
      eventType,
      reason,
      status: 'PENDING',
      failedAt: props.failedAt ?? now,
      createdAt: props.createdAt ?? now,
      updatedAt: props.updatedAt ?? now,
    });
  }

  static restore(props: DeadLetterMessageProps): DeadLetterMessage {
    return new DeadLetterMessage(props);
  }

  get id(): string {
    return this.props.id;
  }
  get organizationId(): string | undefined {
    return this.props.organizationId;
  }
  get outboxMessageId(): string | undefined {
    return this.props.outboxMessageId;
  }
  get eventType(): string {
    return this.props.eventType;
  }
  get payload(): DeadLetterJsonObject {
    return this.props.payload;
  }
  get reason(): string {
    return this.props.reason;
  }
  get errorDetails(): DeadLetterJsonObject | undefined {
    return this.props.errorDetails;
  }
  get status(): DeadLetterMessageStatus {
    return this.props.status;
  }
  get failedAt(): Date {
    return this.props.failedAt;
  }
  get reprocessedAt(): Date | undefined {
    return this.props.reprocessedAt;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }
  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  toJSON(): DeadLetterMessageProps {
    return { ...this.props };
  }
}
