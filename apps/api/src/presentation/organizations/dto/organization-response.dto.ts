import { ApiProperty } from '@nestjs/swagger';
import { Organization } from '../../../domain/organizations/organization.entity';

export class OrganizationResponseDto {
  @ApiProperty({ example: '9a0f59cc-0d6a-4da2-af5a-b4e37f53e1b7', format: 'uuid' })
  readonly id: string;

  @ApiProperty({ example: 'Academic League' })
  readonly name: string;

  @ApiProperty({ example: 'academic-league' })
  readonly slug: string;

  @ApiProperty({ example: '2026-06-21T10:30:00.000Z', format: 'date-time' })
  readonly createdAt: string;

  @ApiProperty({ example: '2026-06-21T10:30:00.000Z', format: 'date-time' })
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
