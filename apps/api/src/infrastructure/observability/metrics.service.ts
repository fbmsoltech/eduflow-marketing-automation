import { Injectable } from '@nestjs/common';
import { Gauge, Registry } from 'prom-client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MetricsService {
  private readonly registry = new Registry();
  private readonly outboxPending = this.createGauge(
    'eduflow_outbox_pending_total',
    'Current number of pending outbox messages',
  );
  private readonly outboxPublished = this.createGauge(
    'eduflow_outbox_published_total',
    'Current number of published outbox messages',
  );
  private readonly outboxFailed = this.createGauge(
    'eduflow_outbox_failed_total',
    'Current number of failed outbox messages',
  );
  private readonly deadLettersPending = this.createGauge(
    'eduflow_dead_letters_pending_total',
    'Current number of pending dead letter messages',
  );
  private readonly deadLettersIgnored = this.createGauge(
    'eduflow_dead_letters_ignored_total',
    'Current number of ignored dead letter messages',
  );
  private readonly automationExecutionsSucceeded = this.createGauge(
    'eduflow_automation_executions_succeeded_total',
    'Current number of succeeded automation executions',
  );
  private readonly automationExecutionsFailed = this.createGauge(
    'eduflow_automation_executions_failed_total',
    'Current number of failed automation executions',
  );
  private readonly automationFlowsActive = this.createGauge(
    'eduflow_automation_flows_active_total',
    'Current number of active automation flows',
  );

  constructor(private readonly prisma: PrismaService) {}

  async render(): Promise<string> {
    await this.refresh();
    return this.registry.metrics();
  }

  get contentType(): string {
    return this.registry.contentType;
  }

  private async refresh(): Promise<void> {
    const [
      outboxPending,
      outboxPublished,
      outboxFailed,
      deadLettersPending,
      deadLettersIgnored,
      automationExecutionsSucceeded,
      automationExecutionsFailed,
      automationFlowsActive,
    ] = await Promise.all([
      this.prisma.outboxMessage.count({ where: { status: 'PENDING' } }),
      this.prisma.outboxMessage.count({ where: { status: 'PUBLISHED' } }),
      this.prisma.outboxMessage.count({ where: { status: 'FAILED' } }),
      this.prisma.deadLetterMessage.count({ where: { status: 'PENDING' } }),
      this.prisma.deadLetterMessage.count({ where: { status: 'IGNORED' } }),
      this.prisma.automationExecution.count({ where: { status: 'SUCCEEDED' } }),
      this.prisma.automationExecution.count({ where: { status: 'FAILED' } }),
      this.prisma.automationFlow.count({ where: { status: 'ACTIVE' } }),
    ]);

    this.outboxPending.set(outboxPending);
    this.outboxPublished.set(outboxPublished);
    this.outboxFailed.set(outboxFailed);
    this.deadLettersPending.set(deadLettersPending);
    this.deadLettersIgnored.set(deadLettersIgnored);
    this.automationExecutionsSucceeded.set(automationExecutionsSucceeded);
    this.automationExecutionsFailed.set(automationExecutionsFailed);
    this.automationFlowsActive.set(automationFlowsActive);
  }

  private createGauge(name: string, help: string): Gauge {
    return new Gauge({ name, help, registers: [this.registry] });
  }
}
