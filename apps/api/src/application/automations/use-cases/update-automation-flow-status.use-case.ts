import { Inject, Injectable } from '@nestjs/common';
import { AutomationFlow } from '../../../domain/automations/automation-flow.entity';
import { AutomationFlowStatus } from '../../../domain/automations/automation-types';
import { AUTOMATIONS_REPOSITORY, AutomationsRepository } from '../automations.repository';
import { AutomationFlowNotFoundError } from '../errors';

@Injectable()
export class UpdateAutomationFlowStatusUseCase {
  constructor(
    @Inject(AUTOMATIONS_REPOSITORY)
    private readonly automationsRepository: AutomationsRepository,
  ) {}

  async execute(id: string, status: AutomationFlowStatus): Promise<AutomationFlow> {
    const flow = await this.automationsRepository.updateStatus(id, status);

    if (!flow) {
      throw new AutomationFlowNotFoundError(id);
    }

    return flow;
  }
}
