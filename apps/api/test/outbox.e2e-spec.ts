import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import type { Server } from 'node:http';
import request from 'supertest';
import {
  CAMPAIGNS_REPOSITORY,
  CampaignsRepository,
} from '../src/application/campaigns/campaigns.repository';
import {
  LEAD_EVENTS_REPOSITORY,
  LeadEventsRepository,
} from '../src/application/lead-events/lead-events.repository';
import {
  MESSAGE_BROKER,
  MessageBroker,
  PublishMessageInput,
} from '../src/application/messaging/message-broker';
import { LEADS_REPOSITORY, LeadsRepository } from '../src/application/leads/leads.repository';
import {
  ORGANIZATIONS_REPOSITORY,
  OrganizationsRepository,
} from '../src/application/organizations/organizations.repository';
import {
  OUTBOX_MESSAGES_REPOSITORY,
  OutboxMessagesRepository,
} from '../src/application/outbox/outbox-messages.repository';
import { AppModule } from '../src/app.module';
import { Campaign, CampaignStatus } from '../src/domain/campaigns/campaign.entity';
import { LeadEvent } from '../src/domain/lead-events/lead-event.entity';
import { Lead, LeadStatus } from '../src/domain/leads/lead.entity';
import { Organization } from '../src/domain/organizations/organization.entity';
import { OutboxMessage, OutboxMessagePayload } from '../src/domain/outbox/outbox-message.entity';
import { PrismaService } from '../src/infrastructure/prisma/prisma.service';

class InMemoryOrganizationsRepository implements OrganizationsRepository {
  private readonly organizations = new Map<string, Organization>();

  create(organization: Organization): Promise<Organization> {
    this.organizations.set(organization.id, organization);

    return Promise.resolve(organization);
  }

  findById(id: string): Promise<Organization | null> {
    return Promise.resolve(this.organizations.get(id) ?? null);
  }

  findBySlug(slug: string): Promise<Organization | null> {
    return Promise.resolve(
      Array.from(this.organizations.values()).find((organization) => organization.slug === slug) ??
        null,
    );
  }

  list(): Promise<Organization[]> {
    return Promise.resolve(Array.from(this.organizations.values()));
  }
}

class InMemoryCampaignsRepository implements CampaignsRepository {
  private readonly campaigns = new Map<string, Campaign>();

  create(campaign: Campaign): Promise<Campaign> {
    this.campaigns.set(campaign.id, campaign);

    return Promise.resolve(campaign);
  }

  findById(id: string): Promise<Campaign | null> {
    return Promise.resolve(this.campaigns.get(id) ?? null);
  }

  findByOrganizationIdAndSlug(organizationId: string, slug: string): Promise<Campaign | null> {
    return Promise.resolve(
      Array.from(this.campaigns.values()).find(
        (campaign) => campaign.organizationId === organizationId && campaign.slug === slug,
      ) ?? null,
    );
  }

  list(): Promise<Campaign[]> {
    return Promise.resolve(Array.from(this.campaigns.values()));
  }

  listByOrganizationId(organizationId: string): Promise<Campaign[]> {
    return Promise.resolve(
      Array.from(this.campaigns.values()).filter(
        (campaign) => campaign.organizationId === organizationId,
      ),
    );
  }

  updateStatus(id: string, status: CampaignStatus): Promise<Campaign | null> {
    const campaign = this.campaigns.get(id);

    if (!campaign) {
      return Promise.resolve(null);
    }

    const updatedCampaign = Campaign.restore({
      ...campaign.toJSON(),
      status,
      updatedAt: new Date(),
    });

    this.campaigns.set(id, updatedCampaign);

    return Promise.resolve(updatedCampaign);
  }
}

class InMemoryLeadsRepository implements LeadsRepository {
  private readonly leads = new Map<string, Lead>();

  create(lead: Lead): Promise<Lead> {
    this.leads.set(lead.id, lead);

    return Promise.resolve(lead);
  }

  findById(id: string): Promise<Lead | null> {
    return Promise.resolve(this.leads.get(id) ?? null);
  }

  findByOrganizationIdAndEmail(organizationId: string, email: string): Promise<Lead | null> {
    return Promise.resolve(
      Array.from(this.leads.values()).find(
        (lead) => lead.organizationId === organizationId && lead.email === email,
      ) ?? null,
    );
  }

  list(): Promise<Lead[]> {
    return Promise.resolve(Array.from(this.leads.values()));
  }

  listByOrganizationId(organizationId: string): Promise<Lead[]> {
    return Promise.resolve(
      Array.from(this.leads.values()).filter((lead) => lead.organizationId === organizationId),
    );
  }

  listByCampaignId(campaignId: string): Promise<Lead[]> {
    return Promise.resolve(
      Array.from(this.leads.values()).filter((lead) => lead.campaignId === campaignId),
    );
  }

  updateStatus(id: string, status: LeadStatus): Promise<Lead | null> {
    const lead = this.leads.get(id);

    if (!lead) {
      return Promise.resolve(null);
    }

    const updatedLead = Lead.restore({ ...lead.toJSON(), status, updatedAt: new Date() });
    this.leads.set(id, updatedLead);

    return Promise.resolve(updatedLead);
  }

  updateScore(id: string, score: number): Promise<Lead | null> {
    const lead = this.leads.get(id);

    if (!lead) {
      return Promise.resolve(null);
    }

    const updatedLead = Lead.restore({ ...lead.toJSON(), score, updatedAt: new Date() });
    this.leads.set(id, updatedLead);

    return Promise.resolve(updatedLead);
  }
}

class InMemoryOutboxMessagesRepository implements OutboxMessagesRepository {
  private readonly outboxMessages = new Map<string, OutboxMessage>();

  create(outboxMessage: OutboxMessage): Promise<OutboxMessage> {
    this.outboxMessages.set(outboxMessage.id, outboxMessage);

    return Promise.resolve(outboxMessage);
  }

  findById(id: string): Promise<OutboxMessage | null> {
    return Promise.resolve(this.outboxMessages.get(id) ?? null);
  }

  list(): Promise<OutboxMessage[]> {
    return Promise.resolve(Array.from(this.outboxMessages.values()));
  }

  listPending(limit: number): Promise<OutboxMessage[]> {
    return Promise.resolve(
      Array.from(this.outboxMessages.values())
        .filter((outboxMessage) => outboxMessage.status === 'PENDING')
        .slice(0, limit),
    );
  }

  markAsPublished(id: string, publishedAt: Date): Promise<void> {
    this.update(id, {
      status: 'PUBLISHED',
      publishedAt,
      lastError: undefined,
    });

    return Promise.resolve();
  }

  markAsFailed(id: string, lastError: string): Promise<void> {
    this.update(id, { status: 'FAILED', lastError });

    return Promise.resolve();
  }

  private update(id: string, changes: Partial<ReturnType<OutboxMessage['toJSON']>>): void {
    const current = this.outboxMessages.get(id);

    if (!current) {
      return;
    }

    this.outboxMessages.set(
      id,
      OutboxMessage.restore({
        ...current.toJSON(),
        ...changes,
        attempts: current.attempts + 1,
        updatedAt: new Date(),
      }),
    );
  }
}

class InMemoryMessageBroker implements MessageBroker {
  readonly publishedMessages: PublishMessageInput[] = [];

  publish(input: PublishMessageInput): Promise<void> {
    this.publishedMessages.push(input);

    return Promise.resolve();
  }
}

class InMemoryLeadEventsRepository implements LeadEventsRepository {
  private readonly leadEvents = new Map<string, LeadEvent>();

  constructor(private readonly outboxMessagesRepository: InMemoryOutboxMessagesRepository) {}

  create(leadEvent: LeadEvent): Promise<LeadEvent> {
    const existingLeadEvent = Array.from(this.leadEvents.values()).find(
      (item) =>
        item.organizationId === leadEvent.organizationId &&
        item.idempotencyKey === leadEvent.idempotencyKey,
    );

    if (existingLeadEvent) {
      return Promise.resolve(existingLeadEvent);
    }

    this.leadEvents.set(leadEvent.id, leadEvent);

    return Promise.resolve(leadEvent);
  }

  async createWithOutboxMessage(
    leadEvent: LeadEvent,
    outboxMessage: OutboxMessage,
  ): Promise<LeadEvent> {
    const existingLeadEvent = Array.from(this.leadEvents.values()).find(
      (item) =>
        item.organizationId === leadEvent.organizationId &&
        item.idempotencyKey === leadEvent.idempotencyKey,
    );

    if (existingLeadEvent) {
      return existingLeadEvent;
    }

    this.leadEvents.set(leadEvent.id, leadEvent);
    await this.outboxMessagesRepository.create(outboxMessage);

    return leadEvent;
  }

  findById(id: string): Promise<LeadEvent | null> {
    return Promise.resolve(this.leadEvents.get(id) ?? null);
  }

  findByOrganizationIdAndIdempotencyKey(
    organizationId: string,
    idempotencyKey: string,
  ): Promise<LeadEvent | null> {
    return Promise.resolve(
      Array.from(this.leadEvents.values()).find(
        (leadEvent) =>
          leadEvent.organizationId === organizationId &&
          leadEvent.idempotencyKey === idempotencyKey,
      ) ?? null,
    );
  }

  list(): Promise<LeadEvent[]> {
    return Promise.resolve(Array.from(this.leadEvents.values()));
  }

  listByOrganizationId(organizationId: string): Promise<LeadEvent[]> {
    return Promise.resolve(
      Array.from(this.leadEvents.values()).filter(
        (leadEvent) => leadEvent.organizationId === organizationId,
      ),
    );
  }

  listByCampaignId(campaignId: string): Promise<LeadEvent[]> {
    return Promise.resolve(
      Array.from(this.leadEvents.values()).filter(
        (leadEvent) => leadEvent.campaignId === campaignId,
      ),
    );
  }

  listByLeadId(leadId: string): Promise<LeadEvent[]> {
    return Promise.resolve(
      Array.from(this.leadEvents.values()).filter((leadEvent) => leadEvent.leadId === leadId),
    );
  }
}

interface OutboxMessageResponseBody {
  id: string;
  organizationId?: string;
  aggregateId: string;
  aggregateType: string;
  eventType: string;
  payload: OutboxMessagePayload;
  status: string;
  attempts: number;
  occurredAt: string;
  correlationId?: string;
  idempotencyKey?: string;
  createdAt: string;
  updatedAt: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isOutboxMessageResponseBody(value: unknown): value is OutboxMessageResponseBody {
  return (
    isRecord(value) &&
    typeof value['id'] === 'string' &&
    typeof value['aggregateId'] === 'string' &&
    typeof value['aggregateType'] === 'string' &&
    typeof value['eventType'] === 'string' &&
    isRecord(value['payload']) &&
    typeof value['status'] === 'string' &&
    typeof value['attempts'] === 'number' &&
    typeof value['occurredAt'] === 'string' &&
    typeof value['createdAt'] === 'string' &&
    typeof value['updatedAt'] === 'string'
  );
}

describe('Outbox endpoints', () => {
  let app: INestApplication;
  let organizationsRepository: InMemoryOrganizationsRepository;
  let campaignsRepository: InMemoryCampaignsRepository;
  let leadsRepository: InMemoryLeadsRepository;
  let leadEventsRepository: InMemoryLeadEventsRepository;
  let outboxMessagesRepository: InMemoryOutboxMessagesRepository;
  let messageBroker: InMemoryMessageBroker;
  let organization: Organization;
  let campaign: Campaign;
  let lead: Lead;

  beforeEach(async () => {
    organizationsRepository = new InMemoryOrganizationsRepository();
    campaignsRepository = new InMemoryCampaignsRepository();
    leadsRepository = new InMemoryLeadsRepository();
    outboxMessagesRepository = new InMemoryOutboxMessagesRepository();
    messageBroker = new InMemoryMessageBroker();
    leadEventsRepository = new InMemoryLeadEventsRepository(outboxMessagesRepository);
    organization = await organizationsRepository.create(
      Organization.create({
        id: randomUUID(),
        name: 'EduFlow University',
        slug: 'eduflow-university',
      }),
    );
    campaign = await campaignsRepository.create(
      Campaign.create({
        id: randomUUID(),
        organizationId: organization.id,
        name: 'Selection Process 2026',
        slug: 'selection-process-2026',
      }),
    );
    lead = await leadsRepository.create(
      Lead.create({
        id: randomUUID(),
        organizationId: organization.id,
        campaignId: campaign.id,
        email: 'candidate@example.com',
      }),
    );

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(ORGANIZATIONS_REPOSITORY)
      .useValue(organizationsRepository)
      .overrideProvider(CAMPAIGNS_REPOSITORY)
      .useValue(campaignsRepository)
      .overrideProvider(LEADS_REPOSITORY)
      .useValue(leadsRepository)
      .overrideProvider(LEAD_EVENTS_REPOSITORY)
      .useValue(leadEventsRepository)
      .overrideProvider(OUTBOX_MESSAGES_REPOSITORY)
      .useValue(outboxMessagesRepository)
      .overrideProvider(MESSAGE_BROKER)
      .useValue(messageBroker)
      .overrideProvider(PrismaService)
      .useValue({
        $connect: () => Promise.resolve(),
        $disconnect: () => Promise.resolve(),
      })
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  it('lists outbox messages created by lead event registration', async () => {
    const httpServer = app.getHttpServer() as Server;

    await request(httpServer)
      .post('/lead-events')
      .send({
        organizationId: organization.id,
        campaignId: campaign.id,
        leadId: lead.id,
        eventType: 'form.submitted',
        occurredAt: '2026-05-20T10:00:00.000Z',
        payload: { formId: 'selection-2026' },
        correlationId: 'corr-123',
        idempotencyKey: 'form.submitted:1',
      })
      .expect(201);

    const response = await request(httpServer).get('/outbox/messages').expect(200);
    const body: unknown = response.body;

    expect(Array.isArray(body)).toBe(true);

    if (!Array.isArray(body) || !isOutboxMessageResponseBody(body[0])) {
      throw new Error('Expected outbox message response list');
    }

    expect(body).toHaveLength(1);
    expect(body[0].aggregateType).toBe('LeadEvent');
    expect(body[0].eventType).toBe('form.submitted');
    expect(body[0].status).toBe('PENDING');
    expect(body[0].attempts).toBe(0);
    expect(body[0].occurredAt).toBe('2026-05-20T10:00:00.000Z');
    expect(body[0].correlationId).toBe('corr-123');
    expect(body[0].idempotencyKey).toBe('form.submitted:1');
    expect(body[0].payload).toMatchObject({
      eventType: 'form.submitted',
      organizationId: organization.id,
      campaignId: campaign.id,
      leadId: lead.id,
      occurredAt: '2026-05-20T10:00:00.000Z',
      correlationId: 'corr-123',
      idempotencyKey: 'form.submitted:1',
      payload: { formId: 'selection-2026' },
    });
  });

  it('finds an outbox message by id', async () => {
    const httpServer = app.getHttpServer() as Server;
    const outboxMessage = await outboxMessagesRepository.create(
      OutboxMessage.create({
        id: randomUUID(),
        organizationId: organization.id,
        aggregateId: randomUUID(),
        aggregateType: 'LeadEvent',
        eventType: 'email.opened',
        payload: {
          eventId: randomUUID(),
          eventType: 'email.opened',
          organizationId: organization.id,
          campaignId: null,
          leadId: null,
          occurredAt: '2026-05-20T10:00:00.000Z',
          correlationId: null,
          idempotencyKey: 'email.opened:1',
          payload: {},
        },
        occurredAt: new Date('2026-05-20T10:00:00.000Z'),
        idempotencyKey: 'email.opened:1',
      }),
    );

    const response = await request(httpServer)
      .get(`/outbox/messages/${outboxMessage.id}`)
      .expect(200);

    expect(response.body as unknown).toMatchObject({
      id: outboxMessage.id,
      aggregateType: 'LeadEvent',
      eventType: 'email.opened',
      status: 'PENDING',
      attempts: 0,
      idempotencyKey: 'email.opened:1',
    });
  });

  it('does not create duplicate outbox messages for an idempotent lead event retry', async () => {
    const httpServer = app.getHttpServer() as Server;
    const payload = {
      organizationId: organization.id,
      eventType: 'email.clicked',
      occurredAt: '2026-05-20T10:00:00.000Z',
      idempotencyKey: 'email.clicked:1',
    };

    await request(httpServer).post('/lead-events').send(payload).expect(201);
    await request(httpServer)
      .post('/lead-events')
      .send({ ...payload, eventType: 'email.opened' })
      .expect(201);

    const response = await request(httpServer).get('/outbox/messages').expect(200);
    const body: unknown = response.body;

    expect(Array.isArray(body)).toBe(true);
    expect(body).toHaveLength(1);
  });

  it('returns not found when outbox message does not exist', async () => {
    const httpServer = app.getHttpServer() as Server;

    await request(httpServer).get(`/outbox/messages/${randomUUID()}`).expect(404);
  });

  it('publishes pending outbox messages and returns a processing summary', async () => {
    const httpServer = app.getHttpServer() as Server;
    const outboxMessage = await outboxMessagesRepository.create(
      OutboxMessage.create({
        id: randomUUID(),
        organizationId: organization.id,
        aggregateId: randomUUID(),
        aggregateType: 'LeadEvent',
        eventType: 'form.submitted',
        payload: { eventId: randomUUID() },
        occurredAt: new Date('2026-05-20T10:00:00.000Z'),
      }),
    );

    await request(httpServer)
      .post('/outbox/messages/publish')
      .send({ limit: 1 })
      .expect(201)
      .expect({
        processed: 1,
        published: 1,
        failed: 0,
      });

    expect(messageBroker.publishedMessages[0]).toMatchObject({
      messageId: outboxMessage.id,
      routingKey: 'lead-events.form.submitted',
      eventType: 'form.submitted',
    });

    const publishedMessage = await outboxMessagesRepository.findById(outboxMessage.id);
    expect(publishedMessage?.status).toBe('PUBLISHED');
    expect(publishedMessage?.attempts).toBe(1);
    expect(publishedMessage?.publishedAt).toBeInstanceOf(Date);
  });

  it('rejects an invalid outbox publish limit', async () => {
    const httpServer = app.getHttpServer() as Server;

    await request(httpServer).post('/outbox/messages/publish').send({ limit: 0 }).expect(400);
  });
});
