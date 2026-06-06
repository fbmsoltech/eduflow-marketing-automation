import { Inject, Injectable } from '@nestjs/common';
import { AutomationFlow } from '../../../domain/automations/automation-flow.entity';
import { AUTOMATIONS_REPOSITORY, AutomationsRepository } from '../automations.repository';
import { AutomationFlowNotFoundError } from '../errors';

@Injectable()
export class FindAutomationFlowByIdUseCase {
  constructor(
    @Inject(AUTOMATIONS_REPOSITORY)
    private readonly automationsRepository: AutomationsRepository,
  ) {}

  async execute(id: string): Promise<AutomationFlow> {
    const flow = await this.automationsRepository.findById(id);

    if (!flow) {
      throw new AutomationFlowNotFoundError(id);
    }

    return flow;
  }
}
