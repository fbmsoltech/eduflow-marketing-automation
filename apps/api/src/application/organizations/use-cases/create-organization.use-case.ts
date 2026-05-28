import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { Organization } from '../../../domain/organizations/organization.entity';
import { OrganizationSlugAlreadyExistsError } from '../errors';
import { ORGANIZATIONS_REPOSITORY, OrganizationsRepository } from '../organizations.repository';

export interface CreateOrganizationInput {
  name: string;
  slug: string;
}

@Injectable()
export class CreateOrganizationUseCase {
  constructor(
    @Inject(ORGANIZATIONS_REPOSITORY)
    private readonly organizationsRepository: OrganizationsRepository,
  ) {}

  async execute(input: CreateOrganizationInput): Promise<Organization> {
    const existingOrganization = await this.organizationsRepository.findBySlug(input.slug);

    if (existingOrganization) {
      throw new OrganizationSlugAlreadyExistsError(input.slug);
    }

    const organization = Organization.create({
      id: randomUUID(),
      name: input.name,
      slug: input.slug,
    });

    return this.organizationsRepository.create(organization);
  }
}
