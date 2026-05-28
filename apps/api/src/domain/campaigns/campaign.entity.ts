export enum CampaignStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  FINISHED = 'FINISHED',
  ARCHIVED = 'ARCHIVED',
}

export type CampaignMetadataValue =
  | string
  | number
  | boolean
  | null
  | CampaignMetadata
  | CampaignMetadataValue[];

export interface CampaignMetadata {
  [key: string]: CampaignMetadataValue;
}

export interface CampaignProps {
  id: string;
  organizationId: string;
  name: string;
  slug: string;
  status: CampaignStatus;
  startsAt?: Date;
  endsAt?: Date;
  metadata?: CampaignMetadata;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCampaignProps {
  id: string;
  organizationId: string;
  name: string;
  slug: string;
  status?: CampaignStatus;
  startsAt?: Date;
  endsAt?: Date;
  metadata?: CampaignMetadata;
  createdAt?: Date;
  updatedAt?: Date;
}

const CAMPAIGN_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export class InvalidCampaignNameError extends Error {
  constructor() {
    super('Campaign name is required');
    this.name = 'InvalidCampaignNameError';
  }
}

export class InvalidCampaignSlugError extends Error {
  constructor(slug: string) {
    super(`Invalid campaign slug: ${slug}`);
    this.name = 'InvalidCampaignSlugError';
  }
}

export class InvalidCampaignPeriodError extends Error {
  constructor() {
    super('Campaign endsAt must be greater than startsAt');
    this.name = 'InvalidCampaignPeriodError';
  }
}

export class Campaign {
  private constructor(private readonly props: CampaignProps) {}

  static create(props: CreateCampaignProps): Campaign {
    const name = props.name.trim();
    const slug = props.slug.trim();

    if (!name) {
      throw new InvalidCampaignNameError();
    }

    if (!CAMPAIGN_SLUG_PATTERN.test(slug)) {
      throw new InvalidCampaignSlugError(slug);
    }

    if (props.startsAt && props.endsAt && props.endsAt <= props.startsAt) {
      throw new InvalidCampaignPeriodError();
    }

    const now = new Date();

    return new Campaign({
      id: props.id,
      organizationId: props.organizationId,
      name,
      slug,
      status: props.status ?? CampaignStatus.DRAFT,
      startsAt: props.startsAt,
      endsAt: props.endsAt,
      metadata: props.metadata,
      createdAt: props.createdAt ?? now,
      updatedAt: props.updatedAt ?? now,
    });
  }

  static restore(props: CampaignProps): Campaign {
    return new Campaign(props);
  }

  get id(): string {
    return this.props.id;
  }

  get organizationId(): string {
    return this.props.organizationId;
  }

  get name(): string {
    return this.props.name;
  }

  get slug(): string {
    return this.props.slug;
  }

  get status(): CampaignStatus {
    return this.props.status;
  }

  get startsAt(): Date | undefined {
    return this.props.startsAt;
  }

  get endsAt(): Date | undefined {
    return this.props.endsAt;
  }

  get metadata(): CampaignMetadata | undefined {
    return this.props.metadata;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  toJSON(): CampaignProps {
    return { ...this.props };
  }
}
