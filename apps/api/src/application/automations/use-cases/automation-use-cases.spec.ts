import { randomUUID } from 'node:crypto';
import { AutomationAction } from '../../../domain/automations/automation-action.entity';
import { AutomationExecution } from '../../../domain/automations/automation-execution.entity';
import { AutomationFlow } from '../../../domain/automations/automation-flow.entity';
import {
  AutomationActionType,
  AutomationExecutionStatus,
  AutomationFlowStatus,
} from '../../../domain/automations/automation-types';
import { Campaign } from '../../../domain/campaigns/campaign.entity';
import { LeadEvent } from '../../../domain/lead-events/lead-event.entity';
import { Organization } from '../../../domain/organizations/organization.entity';
import { CreateAutomationFlowUseCase } from './create-automation-flow.use-case';
import { EvaluateAutomationsForLeadEventUseCase } from './evaluate-automations-for-lead-event.use-case';

describe('Automation use cases', () => {
  const organization = Organization.create({
    id: randomUUID(),
    name: 'EduFlow',
    slug: 'eduflow',
  });
  const campaign = Campaign.create({
    id: randomUUID(),
    organizationId: organization.id,
    name: 'Selection',
    slug: 'selection',
  });
  const event = LeadEvent.create({
    id: randomUUID(),
    eventId: randomUUID(),
    organizationId: organization.id,
    campaignId: campaign.id,
    eventType: 'form.submitted',
    occurredAt: new Date(),
    idempotencyKey: randomUUID(),
  });

  it('creates a draft flow with sorted actions', async () => {
    const automationsRepository = { create: jest.fn((flow: AutomationFlow) => flow) };
    const useCase = new CreateAutomationFlowUseCase(
      automationsRepository as never,
      { findById: jest.fn().mockResolvedValue(organization) } as never,
      { findById: jest.fn().mockResolvedValue(campaign) } as never,
    );

    const flow = await useCase.execute({
      organizationId: organization.id,
      campaignId: campaign.id,
      name: 'Qualified candidate',
      triggerEventType: 'form.submitted',
      actions: [
        { type: AutomationActionType.CREATE_TASK, config: { title: 'Call' }, sortOrder: 2 },
        { type: AutomationActionType.INCREASE_LEAD_SCORE, config: { amount: 10 }, sortOrder: 1 },
      ],
    });

    expect(flow.status).toBe(AutomationFlowStatus.DRAFT);
    expect(flow.actions.map((action) => action.sortOrder)).toEqual([1, 2]);
  });

  it('evaluates matching flows and records successful and failed executions', async () => {
    const successFlow = createActiveFlow(AutomationActionType.CREATE_TASK);
    const failedFlow = createActiveFlow(AutomationActionType.SEND_WEBHOOK);
    const executions: AutomationExecution[] = [];
    const automationsRepository = {
      listActiveForLeadEvent: jest.fn().mockResolvedValue([successFlow, failedFlow]),
      createExecution: jest.fn((execution: AutomationExecution) => {
        executions.push(execution);
        return execution;
      }),
      finishExecution: jest.fn(
        (id: string, status: 'SUCCEEDED' | 'FAILED', errorMessage?: string) => {
          const execution = executions.find((item) => item.id === id);
          if (!execution) throw new Error('Execution not found');
          return AutomationExecution.restore({
            ...execution.toJSON(),
            status:
              status === 'SUCCEEDED'
                ? AutomationExecutionStatus.SUCCEEDED
                : AutomationExecutionStatus.FAILED,
            errorMessage,
            finishedAt: new Date(),
          });
        },
      ),
    };
    const dispatcher = {
      dispatchAll: jest
        .fn()
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('Unsupported action')),
    };
    const useCase = new EvaluateAutomationsForLeadEventUseCase(
      automationsRepository as never,
      { findById: jest.fn().mockResolvedValue(event) } as never,
      { evaluateAll: jest.fn().mockResolvedValue(true) } as never,
      dispatcher as never,
    );

    const result = await useCase.execute(event.id);

    expect(result).toEqual(
      expect.objectContaining({
        matchedFlows: 2,
        executedFlows: 1,
        skippedFlows: 0,
        failedFlows: 1,
      }),
    );
    expect(result.executions.map((execution) => execution.status)).toEqual([
      AutomationExecutionStatus.SUCCEEDED,
      AutomationExecutionStatus.FAILED,
    ]);
  });
});

function createActiveFlow(actionType: AutomationActionType): AutomationFlow {
  const flowId = randomUUID();
  return AutomationFlow.create({
    id: flowId,
    organizationId: randomUUID(),
    name: actionType,
    status: AutomationFlowStatus.ACTIVE,
    triggerEventType: 'form.submitted',
    actions: [
      AutomationAction.create({
        id: randomUUID(),
        flowId,
        type: actionType,
        config: actionType === AutomationActionType.CREATE_TASK ? { title: 'Call' } : {},
      }),
    ],
  });
}
