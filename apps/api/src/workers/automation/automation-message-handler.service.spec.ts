import { Logger } from '@nestjs/common';
import { EvaluateAutomationsForLeadEventUseCase } from '../../application/automations/use-cases/evaluate-automations-for-lead-event.use-case';
import {
  AutomationMessageHandlerService,
  InvalidAutomationMessageError,
} from './automation-message-handler.service';

describe('AutomationMessageHandlerService', () => {
  let execute: jest.MockedFunction<EvaluateAutomationsForLeadEventUseCase['execute']>;
  let log: jest.SpyInstance;
  let service: AutomationMessageHandlerService;

  beforeEach(() => {
    log = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    execute = jest.fn();
    service = new AutomationMessageHandlerService({
      execute,
    } as unknown as EvaluateAutomationsForLeadEventUseCase);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('executes the automation engine for a valid LeadEvent message', async () => {
    execute.mockResolvedValue({
      matchedFlows: 2,
      executedFlows: 1,
      skippedFlows: 1,
      failedFlows: 0,
      executions: [],
    });

    await expect(service.handle(createMessage())).resolves.toEqual(
      expect.objectContaining({
        status: 'PROCESSED',
        aggregateId: 'lead-event-1',
        eventType: 'email.clicked',
      }),
    );
    expect(execute).toHaveBeenCalledWith('lead-event-1');
    expect(log).toHaveBeenCalledWith(
      'Automation engine executed: leadEventId=lead-event-1 eventType=email.clicked matched=2 executed=1 skipped=1 failed=0',
    );
  });

  it('ignores valid messages for another aggregate type', async () => {
    await expect(service.handle(createMessage({ aggregateType: 'Campaign' }))).resolves.toEqual({
      status: 'IGNORED',
      aggregateId: 'lead-event-1',
      eventType: 'email.clicked',
    });
    expect(execute).not.toHaveBeenCalled();
  });

  it('rejects invalid JSON', async () => {
    await expect(service.handle(Buffer.from('{invalid'))).rejects.toBeInstanceOf(
      InvalidAutomationMessageError,
    );
  });

  it('rejects an incomplete envelope', async () => {
    await expect(service.handle(createMessage({ aggregateId: '' }))).rejects.toThrow(
      'Invalid automation message: aggregateId must be a non-empty string',
    );
  });
});

function createMessage(changes: Record<string, unknown> = {}): Buffer {
  return Buffer.from(
    JSON.stringify({
      messageId: 'message-1',
      eventType: 'email.clicked',
      aggregateType: 'LeadEvent',
      aggregateId: 'lead-event-1',
      occurredAt: '2026-05-29T10:30:00.000Z',
      correlationId: 'corr-1',
      payload: { eventId: 'event-1' },
      ...changes,
    }),
  );
}
