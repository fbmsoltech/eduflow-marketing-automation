import { Organization } from '../../../domain/organizations/organization.entity';

export class OrganizationResponseDto {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly createdAt: string;
  readonly updatedAt: string;

  private constructor(organization: Organization) {
    this.id = organization.id;
    this.name = organization.name;
    this.slug = organization.slug;
    this.createdAt = organization.createdAt.toISOString();
    this.updatedAt = organization.updatedAt.toISOString();
  }

  static fromDomain(organization: Organization): OrganizationResponseDto {
    return new OrganizationResponseDto(organization);
  }
}
