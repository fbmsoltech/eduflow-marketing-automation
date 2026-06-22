import { Inject, Injectable } from '@nestjs/common';
import { Organization } from '../../../domain/organizations/organization.entity';
import { ORGANIZATIONS_REPOSITORY, OrganizationsRepository } from '../organizations.repository';

@Injectable()
export class ListOrganizationsUseCase {
  constructor(
    @Inject(ORGANIZATIONS_REPOSITORY)
    private readonly organizationsRepository: OrganizationsRepository,
  ) {}

  async execute(): Promise<Organization[]> {
    return this.organizationsRepository.list();
  }
}
