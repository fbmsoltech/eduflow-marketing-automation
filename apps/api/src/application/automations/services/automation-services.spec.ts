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
  const originalEnvironment = process.env;
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
  const webhookClient = { send: jest.fn() };
  const createDeadLetterMessageUseCase = { execute: jest.fn() };
  const dispatchContext = { automationExecutionId: randomUUID() };
  const fieldResolver = new AutomationFieldResolverService(
    leadsRepository as never,
    { findById: jest.fn().mockResolvedValue({ slug: 'selection-2026' }) } as never,
    { findById: jest.fn().mockResolvedValue({ slug: 'eduflow' }) } as never,
  );
  const evaluator = new AutomationConditionEvaluatorService(fieldResolver);
  const dispatcher = new AutomationActionDispatcherService(
    automationsRepository as never,
    leadsRepository as never,
    webhookClient,
    createDeadLetterMessageUseCase as never,
  );

  beforeEach(() => {
    process.env = {
      ...originalEnvironment,
      WEBHOOK_MAX_ATTEMPTS: '3',
      WEBHOOK_RETRY_DELAY_MS: '0',
      WEBHOOK_TIMEOUT_MS: '50',
    };
    jest.clearAllMocks();
  });

  afterAll(() => {
    process.env = originalEnvironment;
  });

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
      dispatchContext,
    );
    await dispatcher.dispatch(
      AutomationAction.create({
        id: randomUUID(),
        flowId: randomUUID(),
        type: AutomationActionType.UPDATE_LEAD_STATUS,
        config: { status: LeadStatus.QUALIFIED },
      }),
      event,
      dispatchContext,
    );
    await dispatcher.dispatch(
      AutomationAction.create({
        id: randomUUID(),
        flowId: randomUUID(),
        type: AutomationActionType.CREATE_TASK,
        config: { title: 'Call candidate', priority: 'HIGH' },
      }),
      event,
      dispatchContext,
    );

    expect(leadsRepository.updateScore).toHaveBeenCalledWith(leadId, 5);
    expect(leadsRepository.updateStatus).toHaveBeenCalledWith(leadId, LeadStatus.QUALIFIED);
    expect(automationsRepository.createTask).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Call candidate', leadId }),
    );
  });

  it('rejects unsupported notification actions', async () => {
    const action = AutomationAction.create({
      id: randomUUID(),
      flowId: randomUUID(),
      type: AutomationActionType.SEND_NOTIFICATION,
      config: {},
    });

    await expect(dispatcher.dispatch(action, event, dispatchContext)).rejects.toThrow(
      'Automation action SEND_NOTIFICATION is not supported in this phase',
    );
  });

  it('dispatches a webhook with contextual automation payload', async () => {
    webhookClient.send.mockResolvedValue({ statusCode: 204 });
    const action = AutomationAction.create({
      id: randomUUID(),
      flowId: randomUUID(),
      type: AutomationActionType.SEND_WEBHOOK,
      config: { url: 'https://example.com/hooks', headers: { 'x-api-key': 'secret' } },
    });

    await expect(dispatcher.dispatch(action, event, dispatchContext)).resolves.toBeUndefined();

    expect(webhookClient.send).toHaveBeenCalledWith({
      url: 'https://example.com/hooks',
      method: 'POST',
      headers: { 'x-api-key': 'secret' },
      timeoutMs: 50,
      payload: {
        source: 'eduflow',
        eventType: event.eventType,
        organizationId,
        campaignId,
        leadId,
        leadEventId: event.id,
        automationFlowId: action.flowId,
        automationExecutionId: dispatchContext.automationExecutionId,
        occurredAt: event.occurredAt.toISOString(),
        payload: event.payload,
      },
    });
    expect(createDeadLetterMessageUseCase.execute).not.toHaveBeenCalled();
  });

  it('retries failed webhooks and creates a dead letter after the final attempt', async () => {
    webhookClient.send
      .mockRejectedValueOnce(new Error('Connection refused'))
      .mockResolvedValueOnce({ statusCode: 503 })
      .mockResolvedValueOnce({ statusCode: 500 });
    const action = AutomationAction.create({
      id: randomUUID(),
      flowId: randomUUID(),
      type: AutomationActionType.SEND_WEBHOOK,
      config: { url: 'https://example.com/hooks' },
    });

    await expect(dispatcher.dispatch(action, event, dispatchContext)).rejects.toThrow(
      'Webhook returned HTTP status 500',
    );

    expect(webhookClient.send).toHaveBeenCalledTimes(3);
    expect(createDeadLetterMessageUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId,
        eventType: 'webhook.delivery_failed',
        reason: 'Webhook delivery failed after maximum attempts',
        errorDetails: {
          error: 'Webhook returned HTTP status 500',
          statusCode: 500,
          attempts: 3,
        },
      }),
    );
  });

  it('returns a clear reason for invalid score action configuration', async () => {
    const action = AutomationAction.create({
      id: randomUUID(),
      flowId: randomUUID(),
      type: AutomationActionType.INCREASE_LEAD_SCORE,
      config: { value: 5 },
    });

    await expect(dispatcher.dispatch(action, event, dispatchContext)).rejects.toThrow(
      'Invalid config for automation action INCREASE_LEAD_SCORE: amount must be a positive integer',
    );
  });
});
