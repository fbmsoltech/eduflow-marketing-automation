import { randomUUID } from 'node:crypto';
import { AutomationAction } from '../../../domain/automations/automation-action.entity';
import { AutomationCondition } from '../../../domain/automations/automation-condition.entity';
import {
  AutomationActionType,
  AutomationConditionOperator,
} from '../../../domain/automations/automation-types';
import { LeadEvent } from '../../../domain/lead-events/lead-event.entity';
import { Lead, LeadStatus } from '../../../domain/leads/lead.entity';
import { AutomationActionDispatcherService } from './automation-action-dispatcher.service';
import { AutomationConditionEvaluatorService } from './automation-condition-evaluator.service';
import { AutomationFieldResolverService } from './automation-field-resolver.service';

describe('Automation services', () => {
  const organizationId = randomUUID();
  const campaignId = randomUUID();
  const leadId = randomUUID();
  const event = LeadEvent.create({
    id: randomUUID(),
    eventId: randomUUID(),
    organizationId,
    campaignId,
    leadId,
    eventType: 'form.submitted',
    occurredAt: new Date('2026-06-06T12:00:00.000Z'),
    payload: { form: { completed: true }, points: 10 },
    idempotencyKey: randomUUID(),
  });
  const lead = Lead.create({
    id: leadId,
    organizationId,
    campaignId,
    email: 'student@example.com',
  });
  const leadsRepository = {
    findById: jest.fn().mockResolvedValue(lead),
    updateScore: jest.fn().mockResolvedValue(lead),
    updateStatus: jest.fn().mockResolvedValue(lead),
  };
  const automationsRepository = { createTask: jest.fn().mockResolvedValue(undefined) };
  const fieldResolver = new AutomationFieldResolverService(
    leadsRepository as never,
    { findById: jest.fn().mockResolvedValue({ slug: 'selection-2026' }) } as never,
    { findById: jest.fn().mockResolvedValue({ slug: 'eduflow' }) } as never,
  );
  const evaluator = new AutomationConditionEvaluatorService(fieldResolver);
  const dispatcher = new AutomationActionDispatcherService(
    automationsRepository as never,
    leadsRepository as never,
  );

  beforeEach(() => jest.clearAllMocks());

  it('resolves supported field paths and evaluates conditions with AND logic', async () => {
    const conditions = [
      AutomationCondition.create({
        id: randomUUID(),
        flowId: randomUUID(),
        fieldPath: 'event.payload.form.completed',
        operator: AutomationConditionOperator.EQUALS,
        expectedValue: true,
      }),
      AutomationCondition.create({
        id: randomUUID(),
        flowId: randomUUID(),
        fieldPath: 'lead.email',
        operator: AutomationConditionOperator.CONTAINS,
        expectedValue: '@example.com',
      }),
    ];

    await expect(evaluator.evaluateAll(conditions, event)).resolves.toBe(true);
    await expect(fieldResolver.resolve('campaign.slug', event)).resolves.toBe('selection-2026');
    await expect(fieldResolver.resolve('organization.slug', event)).resolves.toBe('eduflow');
  });

  it('dispatches supported internal actions', async () => {
    await dispatcher.dispatch(
      AutomationAction.create({
        id: randomUUID(),
        flowId: randomUUID(),
        type: AutomationActionType.INCREASE_LEAD_SCORE,
        config: { amount: 5 },
      }),
      event,
    );
    await dispatcher.dispatch(
      AutomationAction.create({
        id: randomUUID(),
        flowId: randomUUID(),
        type: AutomationActionType.UPDATE_LEAD_STATUS,
        config: { status: LeadStatus.QUALIFIED },
      }),
      event,
    );
    await dispatcher.dispatch(
      AutomationAction.create({
        id: randomUUID(),
        flowId: randomUUID(),
        type: AutomationActionType.CREATE_TASK,
        config: { title: 'Call candidate', priority: 'HIGH' },
      }),
      event,
    );

    expect(leadsRepository.updateScore).toHaveBeenCalledWith(leadId, 5);
    expect(leadsRepository.updateStatus).toHaveBeenCalledWith(leadId, LeadStatus.QUALIFIED);
    expect(automationsRepository.createTask).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Call candidate', leadId }),
    );
  });

  it('rejects unsupported actions', async () => {
    const action = AutomationAction.create({
      id: randomUUID(),
      flowId: randomUUID(),
      type: AutomationActionType.SEND_WEBHOOK,
      config: {},
    });

    await expect(dispatcher.dispatch(action, event)).rejects.toThrow(
      'Automation action SEND_WEBHOOK is not supported in this phase',
    );
  });

  it('returns a clear reason for invalid score action configuration', async () => {
    const action = AutomationAction.create({
      id: randomUUID(),
      flowId: randomUUID(),
      type: AutomationActionType.INCREASE_LEAD_SCORE,
      config: { value: 5 },
    });

    await expect(dispatcher.dispatch(action, event)).rejects.toThrow(
      'Invalid config for automation action INCREASE_LEAD_SCORE: amount must be a positive integer',
    );
  });
});
