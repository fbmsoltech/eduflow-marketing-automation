import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EvaluateAutomationsResult } from '../../../application/automations/use-cases/evaluate-automations-for-lead-event.use-case';
import { AutomationAction } from '../../../domain/automations/automation-action.entity';
import { AutomationCondition } from '../../../domain/automations/automation-condition.entity';
import { AutomationExecution } from '../../../domain/automations/automation-execution.entity';
import { AutomationFlow } from '../../../domain/automations/automation-flow.entity';
import {
  AutomationActionType,
  AutomationConditionOperator,
  AutomationExecutionStatus,
  AutomationFlowStatus,
  AutomationJsonObject,
  AutomationJsonValue,
} from '../../../domain/automations/automation-types';

export class AutomationConditionResponseDto {
  @ApiProperty({ example: '7332292b-f684-4bda-820c-d5e396233e30', format: 'uuid' })
  readonly id!: string;

  @ApiProperty({ example: '2ac13bbc-c788-4ef9-a056-eae6fd7f5dc2', format: 'uuid' })
  readonly flowId!: string;

  @ApiProperty({ example: 'event.payload.link' })
  readonly fieldPath!: string;

  @ApiProperty({
    enum: AutomationConditionOperator,
    example: AutomationConditionOperator.CONTAINS,
  })
  readonly operator!: AutomationConditionOperator;

  @ApiPropertyOptional({ example: 'edital' })
  readonly expectedValue?: AutomationJsonValue;

  @ApiProperty({ example: 1 })
  readonly sortOrder!: number;

  @ApiProperty({ example: '2026-06-21T10:00:00.000Z', format: 'date-time' })
  readonly createdAt!: string;

  @ApiProperty({ example: '2026-06-21T10:00:00.000Z', format: 'date-time' })
  readonly updatedAt!: string;

  static fromDomain(condition: AutomationCondition): AutomationConditionResponseDto {
    return {
      ...condition.toJSON(),
      createdAt: condition.createdAt.toISOString(),
      updatedAt: condition.updatedAt.toISOString(),
    };
  }
}

export class AutomationActionResponseDto {
  @ApiProperty({ example: '248806a6-6110-43fb-8771-77ae4ae97a43', format: 'uuid' })
  readonly id!: string;

  @ApiProperty({ example: '2ac13bbc-c788-4ef9-a056-eae6fd7f5dc2', format: 'uuid' })
  readonly flowId!: string;

  @ApiProperty({ enum: AutomationActionType, example: AutomationActionType.INCREASE_LEAD_SCORE })
  readonly type!: AutomationActionType;

  @ApiProperty({
    example: {
      amount: 10,
    },
    type: 'object',
    additionalProperties: true,
  })
  readonly config!: AutomationJsonObject;

  @ApiProperty({ example: 1 })
  readonly sortOrder!: number;

  @ApiProperty({ example: '2026-06-21T10:00:00.000Z', format: 'date-time' })
  readonly createdAt!: string;

  @ApiProperty({ example: '2026-06-21T10:00:00.000Z', format: 'date-time' })
  readonly updatedAt!: string;

  static fromDomain(action: AutomationAction): AutomationActionResponseDto {
    return {
      ...action.toJSON(),
      createdAt: action.createdAt.toISOString(),
      updatedAt: action.updatedAt.toISOString(),
    };
  }
}

export class AutomationFlowResponseDto {
  @ApiProperty({ example: '2ac13bbc-c788-4ef9-a056-eae6fd7f5dc2', format: 'uuid' })
  readonly id!: string;

  @ApiProperty({ example: '9a0f59cc-0d6a-4da2-af5a-b4e37f53e1b7', format: 'uuid' })
  readonly organizationId!: string;

  @ApiPropertyOptional({ example: 'd6ee8daa-931d-47c0-96f5-dc7da3be4569', format: 'uuid' })
  readonly campaignId?: string;

  @ApiProperty({ example: 'Qualify engaged candidate' })
  readonly name!: string;

  @ApiProperty({ enum: AutomationFlowStatus, example: AutomationFlowStatus.ACTIVE })
  readonly status!: AutomationFlowStatus;

  @ApiProperty({ example: 'email.clicked' })
  readonly triggerEventType!: string;

  @ApiPropertyOptional({
    example: { owner: 'admissions-team' },
    type: 'object',
    additionalProperties: true,
  })
  readonly metadata?: AutomationJsonObject;

  @ApiProperty({ type: () => AutomationConditionResponseDto, isArray: true })
  readonly conditions!: AutomationConditionResponseDto[];

  @ApiProperty({ type: () => AutomationActionResponseDto, isArray: true })
  readonly actions!: AutomationActionResponseDto[];

  @ApiProperty({ example: '2026-06-21T10:00:00.000Z', format: 'date-time' })
  readonly createdAt!: string;

  @ApiProperty({ example: '2026-06-21T10:00:00.000Z', format: 'date-time' })
  readonly updatedAt!: string;

  private constructor(flow: AutomationFlow) {
    Object.assign(this, flow.toJSON(), {
      conditions: flow.conditions.map((condition) =>
        AutomationConditionResponseDto.fromDomain(condition),
      ),
      actions: flow.actions.map((action) => AutomationActionResponseDto.fromDomain(action)),
      createdAt: flow.createdAt.toISOString(),
      updatedAt: flow.updatedAt.toISOString(),
    });
  }

  static fromDomain(flow: AutomationFlow): AutomationFlowResponseDto {
    return new AutomationFlowResponseDto(flow);
  }
}

export class AutomationExecutionResponseDto {
  @ApiProperty({ example: '72199710-1843-450c-9189-2a3df171168b', format: 'uuid' })
  readonly id!: string;

  @ApiProperty({ example: '9a0f59cc-0d6a-4da2-af5a-b4e37f53e1b7', format: 'uuid' })
  readonly organizationId!: string;

  @ApiPropertyOptional({ example: 'd6ee8daa-931d-47c0-96f5-dc7da3be4569', format: 'uuid' })
  readonly campaignId?: string;

  @ApiProperty({ example: '2ac13bbc-c788-4ef9-a056-eae6fd7f5dc2', format: 'uuid' })
  readonly flowId!: string;

  @ApiPropertyOptional({ example: '11fc9f71-feba-4fe4-a09c-04fc96577a8d', format: 'uuid' })
  readonly leadId?: string;

  @ApiPropertyOptional({ example: '1ef567c6-2a55-4f0b-892c-155d073729b1', format: 'uuid' })
  readonly leadEventId?: string;

  @ApiProperty({ enum: AutomationExecutionStatus, example: AutomationExecutionStatus.SUCCEEDED })
  readonly status!: AutomationExecutionStatus;

  @ApiProperty({ example: '2026-06-21T10:30:05.000Z', format: 'date-time' })
  readonly startedAt!: string;

  @ApiPropertyOptional({ example: '2026-06-21T10:30:05.150Z', format: 'date-time' })
  readonly finishedAt?: string;

  @ApiPropertyOptional({ example: 'Webhook delivery failed after 3 attempts' })
  readonly errorMessage?: string;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  readonly metadata?: AutomationJsonObject;

  @ApiProperty({ example: '2026-06-21T10:30:05.000Z', format: 'date-time' })
  readonly createdAt!: string;

  @ApiProperty({ example: '2026-06-21T10:30:05.150Z', format: 'date-time' })
  readonly updatedAt!: string;

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
  @ApiProperty({ example: 1 })
  readonly matchedFlows!: number;

  @ApiProperty({ example: 1 })
  readonly executedFlows!: number;

  @ApiProperty({ example: 0 })
  readonly skippedFlows!: number;

  @ApiProperty({ example: 0 })
  readonly failedFlows!: number;

  @ApiProperty({ type: () => AutomationExecutionResponseDto, isArray: true })
  readonly executions!: AutomationExecutionResponseDto[];

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
