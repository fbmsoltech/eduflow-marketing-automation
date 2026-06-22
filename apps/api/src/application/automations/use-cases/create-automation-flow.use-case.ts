import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { AutomationAction } from '../../../domain/automations/automation-action.entity';
import { AutomationCondition } from '../../../domain/automations/automation-condition.entity';
import { AutomationFlow } from '../../../domain/automations/automation-flow.entity';
import {
  AutomationActionType,
  AutomationConditionOperator,
  AutomationJsonObject,
  AutomationJsonValue,
} from '../../../domain/automations/automation-types';
import { CampaignNotFoundError } from '../../campaigns/errors';
import { CAMPAIGNS_REPOSITORY, CampaignsRepository } from '../../campaigns/campaigns.repository';
import { OrganizationNotFoundError } from '../../organizations/errors';
import {
  ORGANIZATIONS_REPOSITORY,
  OrganizationsRepository,
} from '../../organizations/organizations.repository';
import { AUTOMATIONS_REPOSITORY, AutomationsRepository } from '../automations.repository';
import { CampaignDoesNotBelongToOrganizationError } from '../errors';

export interface CreateAutomationConditionInput {
  fieldPath: string;
  operator: AutomationConditionOperator;
  expectedValue?: AutomationJsonValue;
  sortOrder?: number;
}

export interface CreateAutomationActionInput {
  type: AutomationActionType;
  config: AutomationJsonObject;
  sortOrder?: number;
}

export interface CreateAutomationFlowInput {
  organizationId: string;
  campaignId?: string;
  name: string;
  triggerEventType: string;
  metadata?: AutomationJsonObject;
  conditions?: CreateAutomationConditionInput[];
  actions: CreateAutomationActionInput[];
}

@Injectable()
export class CreateAutomationFlowUseCase {
  constructor(
    @Inject(AUTOMATIONS_REPOSITORY)
    private readonly automationsRepository: AutomationsRepository,
    @Inject(ORGANIZATIONS_REPOSITORY)
    private readonly organizationsRepository: OrganizationsRepository,
    @Inject(CAMPAIGNS_REPOSITORY)
    private readonly campaignsRepository: CampaignsRepository,
  ) {}

  async execute(input: CreateAutomationFlowInput): Promise<AutomationFlow> {
    const organization = await this.organizationsRepository.findById(input.organizationId);

    if (!organization) {
      throw new OrganizationNotFoundError(input.organizationId);
    }

    if (input.campaignId) {
      const campaign = await this.campaignsRepository.findById(input.campaignId);

      if (!campaign) {
        throw new CampaignNotFoundError(input.campaignId);
      }

      if (campaign.organizationId !== input.organizationId) {
        throw new CampaignDoesNotBelongToOrganizationError();
      }
    }

    const flowId = randomUUID();
    const conditions = (input.conditions ?? []).map((condition) =>
      AutomationCondition.create({
        id: randomUUID(),
        flowId,
        ...condition,
      }),
    );
    const actions = input.actions.map((action) =>
      AutomationAction.create({
        id: randomUUID(),
        flowId,
        ...action,
      }),
    );

    return this.automationsRepository.create(
      AutomationFlow.create({
        id: flowId,
        organizationId: input.organizationId,
        campaignId: input.campaignId,
        name: input.name,
        triggerEventType: input.triggerEventType,
        metadata: input.metadata,
        conditions,
        actions,
      }),
    );
  }
}
