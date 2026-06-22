import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import type { Server } from 'node:http';
import request from 'supertest';
import { AUTOMATIONS_REPOSITORY } from '../src/application/automations/automations.repository';
import { CAMPAIGNS_REPOSITORY } from '../src/application/campaigns/campaigns.repository';
import { LEAD_EVENTS_REPOSITORY } from '../src/application/lead-events/lead-events.repository';
import { LEADS_REPOSITORY } from '../src/application/leads/leads.repository';
import { ORGANIZATIONS_REPOSITORY } from '../src/application/organizations/organizations.repository';
import { AppModule } from '../src/app.module';
import { AutomationExecution } from '../src/domain/automations/automation-execution.entity';
import { AutomationFlow } from '../src/domain/automations/automation-flow.entity';
import {
  AutomationExecutionStatus,
  AutomationFlowStatus,
} from '../src/domain/automations/automation-types';
import { Campaign } from '../src/domain/campaigns/campaign.entity';
import { LeadEvent } from '../src/domain/lead-events/lead-event.entity';
import { Lead, LeadStatus } from '../src/domain/leads/lead.entity';
import { Organization } from '../src/domain/organizations/organization.entity';
import { PrismaService } from '../src/infrastructure/prisma/prisma.service';

describe('Automations endpoints', () => {
  let app: INestApplication;
  let httpServer: Server;
  const organization = Organization.create({ id: randomUUID(), name: 'EduFlow', slug: 'eduflow' });
  const campaign = Campaign.create({
    id: randomUUID(),
    organizationId: organization.id,
    name: 'Selection',
    slug: 'selection',
  });
  const lead = Lead.create({
    id: randomUUID(),
    organizationId: organization.id,
    campaignId: campaign.id,
    email: 'student@example.com',
  });
  const event = LeadEvent.create({
    id: randomUUID(),
    eventId: randomUUID(),
    organizationId: organization.id,
    campaignId: campaign.id,
    leadId: lead.id,
    eventType: 'form.submitted',
    occurredAt: new Date('2026-06-06T12:00:00.000Z'),
    payload: { completed: true },
    idempotencyKey: randomUUID(),
  });
  const flows = new Map<string, AutomationFlow>();
  const executions = new Map<string, AutomationExecution>();
  let currentLead = lead;

  beforeEach(async () => {
    flows.clear();
    executions.clear();
    currentLead = lead;

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(ORGANIZATIONS_REPOSITORY)
      .useValue({ findById: jest.fn().mockResolvedValue(organization) })
      .overrideProvider(CAMPAIGNS_REPOSITORY)
      .useValue({ findById: jest.fn().mockResolvedValue(campaign) })
      .overrideProvider(LEAD_EVENTS_REPOSITORY)
      .useValue({ findById: jest.fn().mockResolvedValue(event) })
      .overrideProvider(LEADS_REPOSITORY)
      .useValue({
        findById: jest.fn().mockImplementation(() => Promise.resolve(currentLead)),
        updateScore: jest.fn().mockImplementation((_id: string, score: number) => {
          currentLead = Lead.restore({ ...currentLead.toJSON(), score, updatedAt: new Date() });
          return Promise.resolve(currentLead);
        }),
        updateStatus: jest.fn().mockImplementation((_id: string, status: LeadStatus) => {
          currentLead = Lead.restore({ ...currentLead.toJSON(), status, updatedAt: new Date() });
          return Promise.resolve(currentLead);
        }),
      })
      .overrideProvider(AUTOMATIONS_REPOSITORY)
      .useValue(createAutomationsRepository())
      .overrideProvider(PrismaService)
      .useValue({ $connect: jest.fn(), $disconnect: jest.fn() })
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
    httpServer = app.getHttpServer() as Server;
  });

  afterEach(async () => app.close());

  it('creates, lists, finds and activates an automation flow', async () => {
    const createResponse = await request(httpServer)
      .post('/automations')
      .send({
        organizationId: organization.id,
        campaignId: campaign.id,
        name: 'Score submitted form',
        triggerEventType: 'form.submitted',
        conditions: [
          {
            fieldPath: 'event.payload.completed',
            operator: 'EQUALS',
            expectedValue: true,
          },
        ],
        actions: [{ type: 'INCREASE_LEAD_SCORE', config: { amount: 10 } }],
      })
      .expect(201);

    const flowId = (createResponse.body as { id: string }).id;
    expect((createResponse.body as { status: string }).status).toBe('DRAFT');
    await request(httpServer).get('/automations').expect(200);
    await request(httpServer).get(`/automations/${flowId}`).expect(200);
    await request(httpServer).get(`/organizations/${organization.id}/automations`).expect(200);
    await request(httpServer).get(`/campaigns/${campaign.id}/automations`).expect(200);
    await request(httpServer)
      .patch(`/automations/${flowId}/status`)
      .send({ status: 'ACTIVE' })
      .expect(200);

    const evaluation = await request(httpServer)
      .post('/automations/evaluate')
      .send({ leadEventId: event.id })
      .expect(201);

    expect(evaluation.body as unknown).toEqual(
      expect.objectContaining({ matchedFlows: 1, executedFlows: 1, failedFlows: 0 }),
    );
    expect(currentLead.score).toBe(10);
  });

  it('validates required actions and leadEventId', async () => {
    await request(httpServer)
      .post('/automations')
      .send({
        organizationId: organization.id,
        name: 'Invalid',
        triggerEventType: 'form.submitted',
        actions: [],
      })
      .expect(400);
    await request(httpServer)
      .post('/automations/evaluate')
      .send({ leadEventId: 'invalid' })
      .expect(400);
  });

  it('rejects invalid action configuration when creating a flow', async () => {
    const response = await request(httpServer)
      .post('/automations')
      .send({
        organizationId: organization.id,
        name: 'Invalid score action',
        triggerEventType: 'form.submitted',
        actions: [{ type: 'INCREASE_LEAD_SCORE', config: { value: 10 } }],
      })
      .expect(400);

    expect((response.body as { message: string }).message).toBe(
      'actions[0].config.amount must be a positive integer',
    );
  });

  it('rejects invalid webhook configuration when creating a flow', async () => {
    const response = await request(httpServer)
      .post('/automations')
      .send({
        organizationId: organization.id,
        name: 'Invalid webhook',
        triggerEventType: 'form.submitted',
        actions: [{ type: 'SEND_WEBHOOK', config: { url: 'ftp://example.com/hooks' } }],
      })
      .expect(400);

    expect((response.body as { message: string }).message).toBe(
      'actions[0].config.url must be a valid HTTP URL',
    );
  });

  function createAutomationsRepository() {
    return {
      create: (flow: AutomationFlow) => {
        flows.set(flow.id, flow);
        return Promise.resolve(flow);
      },
      findById: (id: string) => Promise.resolve(flows.get(id) ?? null),
      list: () => Promise.resolve(Array.from(flows.values())),
      listByOrganizationId: (id: string) =>
        Promise.resolve(Array.from(flows.values()).filter((flow) => flow.organizationId === id)),
      listByCampaignId: (id: string) =>
        Promise.resolve(Array.from(flows.values()).filter((flow) => flow.campaignId === id)),
      listActiveForLeadEvent: (organizationId: string, eventType: string, campaignId?: string) =>
        Promise.resolve(
          Array.from(flows.values()).filter(
            (flow) =>
              flow.organizationId === organizationId &&
              flow.triggerEventType === eventType &&
              flow.status === AutomationFlowStatus.ACTIVE &&
              (flow.campaignId === undefined || flow.campaignId === campaignId),
          ),
        ),
      updateStatus: (id: string, status: AutomationFlowStatus) => {
        const flow = flows.get(id);
        if (!flow) return Promise.resolve(null);
        const updated = AutomationFlow.restore({ ...flow.toJSON(), status, updatedAt: new Date() });
        flows.set(id, updated);
        return Promise.resolve(updated);
      },
      createExecution: (execution: AutomationExecution) => {
        executions.set(execution.id, execution);
        return Promise.resolve(execution);
      },
      finishExecution: (id: string, status: 'SUCCEEDED' | 'FAILED', errorMessage?: string) => {
        const execution = executions.get(id);
        if (!execution) throw new Error('Execution not found');
        const updated = AutomationExecution.restore({
          ...execution.toJSON(),
          status:
            status === 'SUCCEEDED'
              ? AutomationExecutionStatus.SUCCEEDED
              : AutomationExecutionStatus.FAILED,
          errorMessage,
          finishedAt: new Date(),
          updatedAt: new Date(),
        });
        executions.set(id, updated);
        return Promise.resolve(updated);
      },
      createTask: jest.fn().mockResolvedValue(undefined),
    };
  }
});
