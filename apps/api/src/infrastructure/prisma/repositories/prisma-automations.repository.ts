import { Injectable } from '@nestjs/common';
import {
  AutomationAction as PrismaAutomationAction,
  AutomationCondition as PrismaAutomationCondition,
  AutomationExecution as PrismaAutomationExecution,
  AutomationFlow as PrismaAutomationFlow,
  AutomationFlowStatus as PrismaAutomationFlowStatus,
  Prisma,
} from '@prisma/client';
import {
  AutomationsRepository,
  CreateTaskInput,
} from '../../../application/automations/automations.repository';
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
import { PrismaService } from '../prisma.service';

type PrismaFlowWithRelations = PrismaAutomationFlow & {
  conditions: PrismaAutomationCondition[];
  actions: PrismaAutomationAction[];
};

@Injectable()
export class PrismaAutomationsRepository implements AutomationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(flow: AutomationFlow): Promise<AutomationFlow> {
    const data = flow.toJSON();
    const created = await this.prisma.automationFlow.create({
      data: {
        id: data.id,
        organizationId: data.organizationId,
        campaignId: data.campaignId,
        name: data.name,
        status: data.status,
        triggerEventType: data.triggerEventType,
        metadata: this.toPrismaJson(data.metadata),
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
        conditions: {
          create: data.conditions.map((condition) => {
            const conditionData = condition.toJSON();
            return {
              id: conditionData.id,
              fieldPath: conditionData.fieldPath,
              operator: conditionData.operator,
              expectedValue: this.toPrismaJson(conditionData.expectedValue),
              sortOrder: conditionData.sortOrder,
              createdAt: conditionData.createdAt,
              updatedAt: conditionData.updatedAt,
            };
          }),
        },
        actions: {
          create: data.actions.map((action) => {
            const actionData = action.toJSON();
            return {
              id: actionData.id,
              type: actionData.type,
              config: actionData.config,
              sortOrder: actionData.sortOrder,
              createdAt: actionData.createdAt,
              updatedAt: actionData.updatedAt,
            };
          }),
        },
      },
      include: this.flowRelations,
    });

    return this.toDomainFlow(created);
  }

  async findById(id: string): Promise<AutomationFlow | null> {
    const flow = await this.prisma.automationFlow.findUnique({
      where: { id },
      include: this.flowRelations,
    });

    return flow ? this.toDomainFlow(flow) : null;
  }

  async list(): Promise<AutomationFlow[]> {
    return this.findMany({});
  }

  async listByOrganizationId(organizationId: string): Promise<AutomationFlow[]> {
    return this.findMany({ organizationId });
  }

  async listByCampaignId(campaignId: string): Promise<AutomationFlow[]> {
    return this.findMany({ campaignId });
  }

  async listActiveForLeadEvent(
    organizationId: string,
    eventType: string,
    campaignId?: string,
  ): Promise<AutomationFlow[]> {
    return this.findMany({
      organizationId,
      triggerEventType: eventType,
      status: PrismaAutomationFlowStatus.ACTIVE,
      OR: campaignId ? [{ campaignId }, { campaignId: null }] : undefined,
      campaignId: campaignId ? undefined : null,
    });
  }

  async updateStatus(id: string, status: AutomationFlowStatus): Promise<AutomationFlow | null> {
    try {
      const flow = await this.prisma.automationFlow.update({
        where: { id },
        data: { status },
        include: this.flowRelations,
      });

      return this.toDomainFlow(flow);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        return null;
      }
      throw error;
    }
  }

  async createExecution(execution: AutomationExecution): Promise<AutomationExecution> {
    const data = execution.toJSON();
    const created = await this.prisma.automationExecution.create({
      data: {
        id: data.id,
        organizationId: data.organizationId,
        campaignId: data.campaignId,
        flowId: data.flowId,
        leadId: data.leadId,
        leadEventId: data.leadEventId,
        status: data.status,
        startedAt: data.startedAt,
        metadata: this.toPrismaJson(data.metadata),
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      },
    });

    return this.toDomainExecution(created);
  }

  async finishExecution(
    id: string,
    status: 'SUCCEEDED' | 'FAILED',
    errorMessage?: string,
  ): Promise<AutomationExecution> {
    const execution = await this.prisma.automationExecution.update({
      where: { id },
      data: {
        status,
        errorMessage,
        finishedAt: new Date(),
      },
    });

    return this.toDomainExecution(execution);
  }

  async createTask(input: CreateTaskInput): Promise<void> {
    await this.prisma.task.create({
      data: {
        organizationId: input.organizationId,
        campaignId: input.campaignId,
        leadId: input.leadId,
        title: input.title,
        description: input.description,
        priority: input.priority,
        dueAt: input.dueAt,
        metadata: this.toPrismaJson(input.metadata),
      },
    });
  }

  private readonly flowRelations = {
    conditions: { orderBy: { sortOrder: 'asc' as const } },
    actions: { orderBy: { sortOrder: 'asc' as const } },
  };

  private async findMany(where: Prisma.AutomationFlowWhereInput): Promise<AutomationFlow[]> {
    const flows = await this.prisma.automationFlow.findMany({
      where,
      include: this.flowRelations,
      orderBy: { createdAt: 'desc' },
    });

    return flows.map((flow) => this.toDomainFlow(flow));
  }

  private toDomainFlow(flow: PrismaFlowWithRelations): AutomationFlow {
    return AutomationFlow.restore({
      id: flow.id,
      organizationId: flow.organizationId,
      campaignId: flow.campaignId ?? undefined,
      name: flow.name,
      status: flow.status as AutomationFlowStatus,
      triggerEventType: flow.triggerEventType,
      metadata: this.toDomainObject(flow.metadata),
      conditions: flow.conditions.map((condition) =>
        AutomationCondition.restore({
          id: condition.id,
          flowId: condition.flowId,
          fieldPath: condition.fieldPath,
          operator: condition.operator as AutomationConditionOperator,
          expectedValue: this.toDomainJson(condition.expectedValue),
          sortOrder: condition.sortOrder,
          createdAt: condition.createdAt,
          updatedAt: condition.updatedAt,
        }),
      ),
      actions: flow.actions.map((action) =>
        AutomationAction.restore({
          id: action.id,
          flowId: action.flowId,
          type: action.type as AutomationActionType,
          config: this.toDomainObject(action.config) ?? {},
          sortOrder: action.sortOrder,
          createdAt: action.createdAt,
          updatedAt: action.updatedAt,
        }),
      ),
      createdAt: flow.createdAt,
      updatedAt: flow.updatedAt,
    });
  }

  private toDomainExecution(execution: PrismaAutomationExecution): AutomationExecution {
    return AutomationExecution.restore({
      id: execution.id,
      organizationId: execution.organizationId,
      campaignId: execution.campaignId ?? undefined,
      flowId: execution.flowId,
      leadId: execution.leadId ?? undefined,
      leadEventId: execution.leadEventId ?? undefined,
      status: execution.status as AutomationExecutionStatus,
      startedAt: execution.startedAt,
      finishedAt: execution.finishedAt ?? undefined,
      errorMessage: execution.errorMessage ?? undefined,
      metadata: this.toDomainObject(execution.metadata),
      createdAt: execution.createdAt,
      updatedAt: execution.updatedAt,
    });
  }

  private toDomainObject(value: Prisma.JsonValue | null): AutomationJsonObject | undefined {
    const converted = this.toDomainJson(value);
    return converted && typeof converted === 'object' && !Array.isArray(converted)
      ? converted
      : undefined;
  }

  private toDomainJson(value: Prisma.JsonValue | null): AutomationJsonValue | undefined {
    return value === null ? undefined : (value as AutomationJsonValue);
  }

  private toPrismaJson(value: AutomationJsonValue | undefined): Prisma.InputJsonValue | undefined {
    return value === undefined ? undefined : (value as Prisma.InputJsonValue);
  }
}
