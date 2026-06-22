import { Inject, Injectable } from '@nestjs/common';
import { AutomationFlow } from '../../../domain/automations/automation-flow.entity';
import { OrganizationNotFoundError } from '../../organizations/errors';
import {
  ORGANIZATIONS_REPOSITORY,
  OrganizationsRepository,
} from '../../organizations/organizations.repository';
import { AUTOMATIONS_REPOSITORY, AutomationsRepository } from '../automations.repository';

@Injectable()
export class ListAutomationFlowsByOrganizationUseCase {
  constructor(
    @Inject(AUTOMATIONS_REPOSITORY)
    private readonly automationsRepository: AutomationsRepository,
    @Inject(ORGANIZATIONS_REPOSITORY)
    private readonly organizationsRepository: OrganizationsRepository,
  ) {}

  async execute(organizationId: string): Promise<AutomationFlow[]> {
    if (!(await this.organizationsRepository.findById(organizationId))) {
      throw new OrganizationNotFoundError(organizationId);
    }

    return this.automationsRepository.listByOrganizationId(organizationId);
  }
}
