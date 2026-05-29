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
import { LEADS_REPOSITORY, LeadsRepository } from '../src/application/leads/leads.repository';
import {
  ORGANIZATIONS_REPOSITORY,
  OrganizationsRepository,
} from '../src/application/organizations/organizations.repository';
import { AppModule } from '../src/app.module';
import { Campaign, CampaignStatus } from '../src/domain/campaigns/campaign.entity';
import { LeadEvent, LeadEventPayload } from '../src/domain/lead-events/lead-event.entity';
import { Lead, LeadStatus } from '../src/domain/leads/lead.entity';
import { Organization } from '../src/domain/organizations/organization.entity';
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

    const updatedLead = Lead.restore({
      ...lead.toJSON(),
      status,
      updatedAt: new Date(),
    });

    this.leads.set(id, updatedLead);

    return Promise.resolve(updatedLead);
  }

  updateScore(id: string, score: number): Promise<Lead | null> {
    const lead = this.leads.get(id);

    if (!lead) {
      return Promise.resolve(null);
    }

    const updatedLead = Lead.restore({
      ...lead.toJSON(),
      score,
      updatedAt: new Date(),
    });

    this.leads.set(id, updatedLead);

    return Promise.resolve(updatedLead);
  }
}

class InMemoryLeadEventsRepository implements LeadEventsRepository {
  private readonly leadEvents = new Map<string, LeadEvent>();

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

interface LeadEventResponseBody {
  id: string;
  eventId: string;
  eventType: string;
  organizationId: string;
  campaignId?: string;
  leadId?: string;
  occurredAt: string;
  payload: LeadEventPayload;
  correlationId?: string;
  idempotencyKey: string;
  createdAt: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isLeadEventResponseBody(value: unknown): value is LeadEventResponseBody {
  return (
    isRecord(value) &&
    typeof value['id'] === 'string' &&
    typeof value['eventId'] === 'string' &&
    typeof value['eventType'] === 'string' &&
    typeof value['organizationId'] === 'string' &&
    typeof value['occurredAt'] === 'string' &&
    isRecord(value['payload']) &&
    typeof value['idempotencyKey'] === 'string' &&
    typeof value['createdAt'] === 'string'
  );
}

describe('Lead events endpoints', () => {
  let app: INestApplication;
  let organizationsRepository: InMemoryOrganizationsRepository;
  let campaignsRepository: InMemoryCampaignsRepository;
  let leadsRepository: InMemoryLeadsRepository;
  let leadEventsRepository: InMemoryLeadEventsRepository;
  let organization: Organization;
  let campaign: Campaign;
  let lead: Lead;

  beforeEach(async () => {
    organizationsRepository = new InMemoryOrganizationsRepository();
    campaignsRepository = new InMemoryCampaignsRepository();
    leadsRepository = new InMemoryLeadsRepository();
    leadEventsRepository = new InMemoryLeadEventsRepository();
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

  it('registers a lead event', async () => {
    const httpServer = app.getHttpServer() as Server;

    const response = await request(httpServer)
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
      });

    expect(response.status).toBe(201);

    const body: unknown = response.body;

    expect(isLeadEventResponseBody(body)).toBe(true);

    if (!isLeadEventResponseBody(body)) {
      throw new Error('Expected lead event response body');
    }

    expect(body.organizationId).toBe(organization.id);
    expect(body.campaignId).toBe(campaign.id);
    expect(body.leadId).toBe(lead.id);
    expect(body.eventType).toBe('form.submitted');
    expect(body.occurredAt).toBe('2026-05-20T10:00:00.000Z');
    expect(body.payload).toEqual({ formId: 'selection-2026' });
    expect(body.correlationId).toBe('corr-123');
    expect(body.idempotencyKey).toBe('form.submitted:1');
  });

  it('returns the existing event for duplicated organization idempotency key', async () => {
    const httpServer = app.getHttpServer() as Server;
    const payload = {
      organizationId: organization.id,
      eventType: 'email.opened',
      occurredAt: '2026-05-20T10:00:00.000Z',
      idempotencyKey: 'email.opened:1',
    };

    const firstResponse = await request(httpServer).post('/lead-events').send(payload).expect(201);
    const secondResponse = await request(httpServer)
      .post('/lead-events')
      .send({ ...payload, eventType: 'email.clicked' })
      .expect(201);

    expect((secondResponse.body as LeadEventResponseBody).id).toBe(
      (firstResponse.body as LeadEventResponseBody).id,
    );
  });

  it('stores empty payload when payload is not informed', async () => {
    const httpServer = app.getHttpServer() as Server;

    const response = await request(httpServer)
      .post('/lead-events')
      .send({
        organizationId: organization.id,
        eventType: 'email.opened',
        occurredAt: '2026-05-20T10:00:00.000Z',
        idempotencyKey: 'email.opened:1',
      })
      .expect(201);

    expect((response.body as LeadEventResponseBody).payload).toEqual({});
  });

  it('rejects invalid request payload', async () => {
    const httpServer = app.getHttpServer() as Server;

    await request(httpServer)
      .post('/lead-events')
      .send({
        organizationId: organization.id,
        eventType: '',
        occurredAt: 'invalid-date',
        idempotencyKey: '',
      })
      .expect(400);
  });

  it('returns not found when organization does not exist', async () => {
    const httpServer = app.getHttpServer() as Server;

    await request(httpServer)
      .post('/lead-events')
      .send({
        organizationId: randomUUID(),
        eventType: 'form.submitted',
        occurredAt: '2026-05-20T10:00:00.000Z',
        idempotencyKey: 'form.submitted:1',
      })
      .expect(404);
  });

  it('returns not found when lead event does not exist', async () => {
    const httpServer = app.getHttpServer() as Server;

    await request(httpServer).get(`/lead-events/${randomUUID()}`).expect(404);
  });

  it('lists and finds lead events', async () => {
    const httpServer = app.getHttpServer() as Server;
    const leadEvent = await leadEventsRepository.create(
      LeadEvent.create({
        id: randomUUID(),
        eventId: randomUUID(),
        organizationId: organization.id,
        campaignId: campaign.id,
        leadId: lead.id,
        eventType: 'email.clicked',
        occurredAt: new Date('2026-05-20T10:00:00.000Z'),
        idempotencyKey: 'email.clicked:1',
      }),
    );

    const listResponse = await request(httpServer).get('/lead-events').expect(200);
    const findResponse = await request(httpServer).get(`/lead-events/${leadEvent.id}`).expect(200);

    const listBody: unknown = listResponse.body;

    expect(Array.isArray(listBody)).toBe(true);
    expect(findResponse.body as unknown).toEqual({
      id: leadEvent.id,
      eventId: leadEvent.eventId,
      eventType: 'email.clicked',
      organizationId: organization.id,
      campaignId: campaign.id,
      leadId: lead.id,
      occurredAt: leadEvent.occurredAt.toISOString(),
      payload: {},
      idempotencyKey: 'email.clicked:1',
      createdAt: leadEvent.createdAt.toISOString(),
    });
  });

  it('lists lead events by organization, campaign and lead', async () => {
    const httpServer = app.getHttpServer() as Server;

    await leadEventsRepository.create(
      LeadEvent.create({
        id: randomUUID(),
        eventId: randomUUID(),
        organizationId: organization.id,
        campaignId: campaign.id,
        leadId: lead.id,
        eventType: 'whatsapp.link_clicked',
        occurredAt: new Date('2026-05-20T10:00:00.000Z'),
        idempotencyKey: 'whatsapp.link_clicked:1',
      }),
    );

    const organizationResponse = await request(httpServer)
      .get(`/organizations/${organization.id}/lead-events`)
      .expect(200);
    const campaignResponse = await request(httpServer)
      .get(`/campaigns/${campaign.id}/lead-events`)
      .expect(200);
    const leadResponse = await request(httpServer).get(`/leads/${lead.id}/lead-events`).expect(200);

    const organizationBody: unknown = organizationResponse.body;
    const campaignBody: unknown = campaignResponse.body;
    const leadBody: unknown = leadResponse.body;

    expect(Array.isArray(organizationBody)).toBe(true);
    expect(Array.isArray(campaignBody)).toBe(true);
    expect(Array.isArray(leadBody)).toBe(true);

    if (
      !Array.isArray(organizationBody) ||
      !isLeadEventResponseBody(organizationBody[0]) ||
      !Array.isArray(campaignBody) ||
      !isLeadEventResponseBody(campaignBody[0]) ||
      !Array.isArray(leadBody) ||
      !isLeadEventResponseBody(leadBody[0])
    ) {
      throw new Error('Expected lead event response lists');
    }

    expect(organizationBody[0].organizationId).toBe(organization.id);
    expect(campaignBody[0].campaignId).toBe(campaign.id);
    expect(leadBody[0].leadId).toBe(lead.id);
  });
});
