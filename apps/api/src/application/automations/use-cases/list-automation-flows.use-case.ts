import { Inject, Injectable } from '@nestjs/common';
import { AutomationFlow } from '../../../domain/automations/automation-flow.entity';
import { AUTOMATIONS_REPOSITORY, AutomationsRepository } from '../automations.repository';

@Injectable()
export class ListAutomationFlowsUseCase {
  constructor(
    @Inject(AUTOMATIONS_REPOSITORY)
    private readonly automationsRepository: AutomationsRepository,
  ) {}

  execute(): Promise<AutomationFlow[]> {
    return this.automationsRepository.list();
  }
}
