export interface OrganizationProps {
  id: string;
  name: string;
  slug: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateOrganizationProps {
  id: string;
  name: string;
  slug: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const ORGANIZATION_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export class InvalidOrganizationSlugError extends Error {
  constructor(slug: string) {
    super(`Invalid organization slug: ${slug}`);
    this.name = 'InvalidOrganizationSlugError';
  }
}

export class InvalidOrganizationNameError extends Error {
  constructor() {
    super('Organization name is required');
    this.name = 'InvalidOrganizationNameError';
  }
}

export class Organization {
  private constructor(private readonly props: OrganizationProps) {}

  static create(props: CreateOrganizationProps): Organization {
    const name = props.name.trim();
    const slug = props.slug.trim();

    if (!name) {
      throw new InvalidOrganizationNameError();
    }

    if (!ORGANIZATION_SLUG_PATTERN.test(slug)) {
      throw new InvalidOrganizationSlugError(slug);
    }

    const now = new Date();

    return new Organization({
      id: props.id,
      name,
      slug,
      createdAt: props.createdAt ?? now,
      updatedAt: props.updatedAt ?? now,
    });
  }

  static restore(props: OrganizationProps): Organization {
    return new Organization(props);
  }

  get id(): string {
    return this.props.id;
  }

  get name(): string {
    return this.props.name;
  }

  get slug(): string {
    return this.props.slug;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  toJSON(): OrganizationProps {
    return { ...this.props };
  }
}
