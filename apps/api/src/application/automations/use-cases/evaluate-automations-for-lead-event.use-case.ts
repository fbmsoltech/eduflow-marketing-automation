import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { AutomationExecution } from '../../../domain/automations/automation-execution.entity';
import { LeadEventNotFoundError } from '../../lead-events/errors';
import {
  LEAD_EVENTS_REPOSITORY,
  LeadEventsRepository,
} from '../../lead-events/lead-events.repository';
import { AUTOMATIONS_REPOSITORY, AutomationsRepository } from '../automations.repository';
import { AutomationActionDispatcherService } from '../services/automation-action-dispatcher.service';
import { AutomationConditionEvaluatorService } from '../services/automation-condition-evaluator.service';

export interface EvaluateAutomationsResult {
  matchedFlows: number;
  executedFlows: number;
  skippedFlows: number;
  failedFlows: number;
  executions: AutomationExecution[];
}

@Injectable()
export class EvaluateAutomationsForLeadEventUseCase {
  constructor(
    @Inject(AUTOMATIONS_REPOSITORY)
    private readonly automationsRepository: AutomationsRepository,
    @Inject(LEAD_EVENTS_REPOSITORY)
    private readonly leadEventsRepository: LeadEventsRepository,
    private readonly conditionEvaluator: AutomationConditionEvaluatorService,
    private readonly actionDispatcher: AutomationActionDispatcherService,
  ) {}

  async execute(leadEventId: string): Promise<EvaluateAutomationsResult> {
    const event = await this.leadEventsRepository.findById(leadEventId);

    if (!event) throw new LeadEventNotFoundError(leadEventId);

    const flows = await this.automationsRepository.listActiveForLeadEvent(
      event.organizationId,
      event.eventType,
      event.campaignId,
    );
    const result: EvaluateAutomationsResult = {
      matchedFlows: 0,
      executedFlows: 0,
      skippedFlows: 0,
      failedFlows: 0,
      executions: [],
    };

    for (const flow of flows) {
      if (!(await this.conditionEvaluator.evaluateAll(flow.conditions, event))) {
        result.skippedFlows += 1;
        continue;
      }

      result.matchedFlows += 1;
      let execution = await this.automationsRepository.createExecution(
        AutomationExecution.create({
          id: randomUUID(),
          organizationId: event.organizationId,
          campaignId: event.campaignId,
          flowId: flow.id,
          leadId: event.leadId,
          leadEventId: event.id,
        }),
      );

      try {
        await this.actionDispatcher.dispatchAll(flow.actions, event);
        execution = await this.automationsRepository.finishExecution(execution.id, 'SUCCEEDED');
        result.executedFlows += 1;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown automation action error';
        execution = await this.automationsRepository.finishExecution(
          execution.id,
          'FAILED',
          message,
        );
        result.failedFlows += 1;
      }

      result.executions.push(execution);
    }

    return result;
  }
}
