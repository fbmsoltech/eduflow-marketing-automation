import { Inject, Injectable } from '@nestjs/common';
import { Organization } from '../../../domain/organizations/organization.entity';
import { OrganizationNotFoundError } from '../errors';
import { ORGANIZATIONS_REPOSITORY, OrganizationsRepository } from '../organizations.repository';

@Injectable()
export class FindOrganizationByIdUseCase {
  constructor(
    @Inject(ORGANIZATIONS_REPOSITORY)
    private readonly organizationsRepository: OrganizationsRepository,
  ) {}

  async execute(id: string): Promise<Organization> {
    const organization = await this.organizationsRepository.findById(id);

    if (!organization) {
      throw new OrganizationNotFoundError(id);
    }

    return organization;
  }
}
