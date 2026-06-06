import { EvaluateAutomationsResult } from '../../../application/automations/use-cases/evaluate-automations-for-lead-event.use-case';
import { AutomationExecution } from '../../../domain/automations/automation-execution.entity';
import { AutomationFlow } from '../../../domain/automations/automation-flow.entity';

export class AutomationFlowResponseDto {
  private constructor(flow: AutomationFlow) {
    Object.assign(this, flow.toJSON(), {
      conditions: flow.conditions.map((condition) => condition.toJSON()),
      actions: flow.actions.map((action) => action.toJSON()),
      createdAt: flow.createdAt.toISOString(),
      updatedAt: flow.updatedAt.toISOString(),
    });
  }

  static fromDomain(flow: AutomationFlow): AutomationFlowResponseDto {
    return new AutomationFlowResponseDto(flow);
  }
}

export class AutomationExecutionResponseDto {
  private constructor(execution: AutomationExecution) {
    Object.assign(this, execution.toJSON(), {
      startedAt: execution.startedAt.toISOString(),
      finishedAt: execution.finishedAt?.toISOString(),
      createdAt: execution.createdAt.toISOString(),
      updatedAt: execution.updatedAt.toISOString(),
    });
  }

  static fromDomain(execution: AutomationExecution): AutomationExecutionResponseDto {
    return new AutomationExecutionResponseDto(execution);
  }
}

export class EvaluateAutomationsResponseDto {
  private constructor(result: EvaluateAutomationsResult) {
    Object.assign(this, result, {
      executions: result.executions.map((execution) =>
        AutomationExecutionResponseDto.fromDomain(execution),
      ),
    });
  }

  static fromResult(result: EvaluateAutomationsResult): EvaluateAutomationsResponseDto {
    return new EvaluateAutomationsResponseDto(result);
  }
}
