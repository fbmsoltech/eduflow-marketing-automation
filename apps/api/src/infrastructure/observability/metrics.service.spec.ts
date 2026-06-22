import { MetricsService } from './metrics.service';

describe('MetricsService', () => {
  it('renders current application counts in Prometheus format', async () => {
    const service = new MetricsService({
      outboxMessage: {
        count: jest.fn().mockResolvedValueOnce(2).mockResolvedValueOnce(5).mockResolvedValueOnce(1),
      },
      deadLetterMessage: {
        count: jest.fn().mockResolvedValueOnce(3).mockResolvedValueOnce(4),
      },
      automationExecution: {
        count: jest.fn().mockResolvedValueOnce(8).mockResolvedValueOnce(2),
      },
      automationFlow: {
        count: jest.fn().mockResolvedValue(6),
      },
    } as never);

    const metrics = await service.render();

    expect(metrics).toContain('eduflow_outbox_pending_total 2');
    expect(metrics).toContain('eduflow_outbox_published_total 5');
    expect(metrics).toContain('eduflow_outbox_failed_total 1');
    expect(metrics).toContain('eduflow_dead_letters_pending_total 3');
    expect(metrics).toContain('eduflow_dead_letters_ignored_total 4');
    expect(metrics).toContain('eduflow_automation_executions_succeeded_total 8');
    expect(metrics).toContain('eduflow_automation_executions_failed_total 2');
    expect(metrics).toContain('eduflow_automation_flows_active_total 6');
  });
});
