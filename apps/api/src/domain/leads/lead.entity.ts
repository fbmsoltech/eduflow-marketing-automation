export enum LeadStatus {
  NEW = 'NEW',
  ENGAGED = 'ENGAGED',
  QUALIFIED = 'QUALIFIED',
  DISQUALIFIED = 'DISQUALIFIED',
  CONVERTED = 'CONVERTED',
  ARCHIVED = 'ARCHIVED',
}

export type LeadMetadataValue =
  | string
  | number
  | boolean
  | null
  | LeadMetadata
  | LeadMetadataValue[];

export interface LeadMetadata {
  [key: string]: LeadMetadataValue;
}

export interface LeadProps {
  id: string;
  organizationId: string;
  campaignId?: string;
  email: string;
  fullName?: string;
  phone?: string;
  status: LeadStatus;
  score: number;
  metadata?: LeadMetadata;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateLeadProps {
  id: string;
  organizationId: string;
  campaignId?: string;
  email: string;
  fullName?: string;
  phone?: string;
  status?: LeadStatus;
  score?: number;
  metadata?: LeadMetadata;
  createdAt?: Date;
  updatedAt?: Date;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class InvalidLeadEmailError extends Error {
  constructor(email: string) {
    super(`Invalid lead email: ${email}`);
    this.name = 'InvalidLeadEmailError';
  }
}

export class InvalidLeadScoreError extends Error {
  constructor(score: number) {
    super(`Lead score cannot be negative: ${score}`);
    this.name = 'InvalidLeadScoreError';
  }
}

export class Lead {
  private constructor(private readonly props: LeadProps) {}

  static create(props: CreateLeadProps): Lead {
    const email = props.email.trim().toLowerCase();
    const score = props.score ?? 0;

    if (!EMAIL_PATTERN.test(email)) {
      throw new InvalidLeadEmailError(props.email);
    }

    if (score < 0) {
      throw new InvalidLeadScoreError(score);
    }

    const now = new Date();

    return new Lead({
      id: props.id,
      organizationId: props.organizationId,
      campaignId: props.campaignId,
      email,
      fullName: props.fullName?.trim() || undefined,
      phone: props.phone?.trim() || undefined,
      status: props.status ?? LeadStatus.NEW,
      score,
      metadata: props.metadata,
      createdAt: props.createdAt ?? now,
      updatedAt: props.updatedAt ?? now,
    });
  }

  static restore(props: LeadProps): Lead {
    return new Lead(props);
  }

  get id(): string {
    return this.props.id;
  }

  get organizationId(): string {
    return this.props.organizationId;
  }

  get campaignId(): string | undefined {
    return this.props.campaignId;
  }

  get email(): string {
    return this.props.email;
  }

  get fullName(): string | undefined {
    return this.props.fullName;
  }

  get phone(): string | undefined {
    return this.props.phone;
  }

  get status(): LeadStatus {
    return this.props.status;
  }

  get score(): number {
    return this.props.score;
  }

  get metadata(): LeadMetadata | undefined {
    return this.props.metadata;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  toJSON(): LeadProps {
    return { ...this.props };
  }
}
