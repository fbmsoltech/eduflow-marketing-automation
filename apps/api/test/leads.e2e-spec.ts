import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import type { Server } from 'node:http';
import request from 'supertest';
import {
  CAMPAIGNS_REPOSITORY,
  CampaignsRepository,
} from '../src/application/campaigns/campaigns.repository';
import { LEADS_REPOSITORY, LeadsRepository } from '../src/application/leads/leads.repository';
import {
  ORGANIZATIONS_REPOSITORY,
  OrganizationsRepository,
} from '../src/application/organizations/organizations.repository';
import { AppModule } from '../src/app.module';
import { Campaign, CampaignStatus } from '../src/domain/campaigns/campaign.entity';
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

interface LeadResponseBody {
  id: string;
  organizationId: string;
  campaignId?: string;
  email: string;
  fullName?: string;
  phone?: string;
  status: LeadStatus;
  score: number;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isLeadResponseBody(value: unknown): value is LeadResponseBody {
  return (
    isRecord(value) &&
    typeof value['id'] === 'string' &&
    typeof value['organizationId'] === 'string' &&
    typeof value['email'] === 'string' &&
    typeof value['status'] === 'string' &&
    typeof value['score'] === 'number' &&
    typeof value['createdAt'] === 'string' &&
    typeof value['updatedAt'] === 'string'
  );
}

describe('Leads endpoints', () => {
  let app: INestApplication;
  let organizationsRepository: InMemoryOrganizationsRepository;
  let campaignsRepository: InMemoryCampaignsRepository;
  let leadsRepository: InMemoryLeadsRepository;
  let organization: Organization;
  let campaign: Campaign;

  beforeEach(async () => {
    organizationsRepository = new InMemoryOrganizationsRepository();
    campaignsRepository = new InMemoryCampaignsRepository();
    leadsRepository = new InMemoryLeadsRepository();
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

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(ORGANIZATIONS_REPOSITORY)
      .useValue(organizationsRepository)
      .overrideProvider(CAMPAIGNS_REPOSITORY)
      .useValue(campaignsRepository)
      .overrideProvider(LEADS_REPOSITORY)
      .useValue(leadsRepository)
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

  it('creates a lead', async () => {
    const httpServer = app.getHttpServer() as Server;

    const response = await request(httpServer)
      .post('/leads')
      .send({
        organizationId: organization.id,
        campaignId: campaign.id,
        email: 'Candidate@Example.com',
        fullName: 'Candidate One',
        phone: '+55 11 99999-0000',
        metadata: { source: 'landing-page' },
      })
      .expect(201);

    const body: unknown = response.body;

    expect(isLeadResponseBody(body)).toBe(true);

    if (!isLeadResponseBody(body)) {
      throw new Error('Expected lead response body');
    }

    expect(body.organizationId).toBe(organization.id);
    expect(body.campaignId).toBe(campaign.id);
    expect(body.email).toBe('candidate@example.com');
    expect(body.fullName).toBe('Candidate One');
    expect(body.status).toBe(LeadStatus.NEW);
    expect(body.score).toBe(0);
    expect(body.metadata).toEqual({ source: 'landing-page' });
  });

  it('returns conflict when lead email already exists in organization', async () => {
    const httpServer = app.getHttpServer() as Server;

    await request(httpServer).post('/leads').send({
      organizationId: organization.id,
      email: 'candidate@example.com',
    });

    await request(httpServer)
      .post('/leads')
      .send({
        organizationId: organization.id,
        email: 'Candidate@Example.com',
      })
      .expect(409);
  });

  it('returns not found when organization does not exist', async () => {
    const httpServer = app.getHttpServer() as Server;

    await request(httpServer)
      .post('/leads')
      .send({
        organizationId: randomUUID(),
        email: 'candidate@example.com',
      })
      .expect(404);
  });

  it('returns not found when campaign does not exist', async () => {
    const httpServer = app.getHttpServer() as Server;

    await request(httpServer)
      .post('/leads')
      .send({
        organizationId: organization.id,
        campaignId: randomUUID(),
        email: 'candidate@example.com',
      })
      .expect(404);
  });

  it('lists and finds leads', async () => {
    const httpServer = app.getHttpServer() as Server;
    const lead = await leadsRepository.create(
      Lead.create({
        id: randomUUID(),
        organizationId: organization.id,
        campaignId: campaign.id,
        email: 'candidate@example.com',
      }),
    );

    const listResponse = await request(httpServer).get('/leads').expect(200);
    const findResponse = await request(httpServer).get(`/leads/${lead.id}`).expect(200);

    const listBody: unknown = listResponse.body;

    expect(Array.isArray(listBody)).toBe(true);
    expect(findResponse.body as unknown).toEqual({
      id: lead.id,
      organizationId: organization.id,
      campaignId: campaign.id,
      email: 'candidate@example.com',
      status: LeadStatus.NEW,
      score: 0,
      createdAt: lead.createdAt.toISOString(),
      updatedAt: lead.updatedAt.toISOString(),
    });
  });

  it('lists leads by organization and campaign', async () => {
    const httpServer = app.getHttpServer() as Server;

    await leadsRepository.create(
      Lead.create({
        id: randomUUID(),
        organizationId: organization.id,
        campaignId: campaign.id,
        email: 'candidate@example.com',
      }),
    );

    const organizationResponse = await request(httpServer)
      .get(`/organizations/${organization.id}/leads`)
      .expect(200);
    const campaignResponse = await request(httpServer)
      .get(`/campaigns/${campaign.id}/leads`)
      .expect(200);

    const organizationBody: unknown = organizationResponse.body;
    const campaignBody: unknown = campaignResponse.body;

    expect(Array.isArray(organizationBody)).toBe(true);
    expect(Array.isArray(campaignBody)).toBe(true);

    if (
      !Array.isArray(organizationBody) ||
      !isLeadResponseBody(organizationBody[0]) ||
      !Array.isArray(campaignBody) ||
      !isLeadResponseBody(campaignBody[0])
    ) {
      throw new Error('Expected lead response lists');
    }

    expect(organizationBody[0].organizationId).toBe(organization.id);
    expect(campaignBody[0].campaignId).toBe(campaign.id);
  });

  it('updates lead status and score', async () => {
    const httpServer = app.getHttpServer() as Server;
    const lead = await leadsRepository.create(
      Lead.create({
        id: randomUUID(),
        organizationId: organization.id,
        email: 'candidate@example.com',
      }),
    );

    const statusResponse = await request(httpServer)
      .patch(`/leads/${lead.id}/status`)
      .send({ status: LeadStatus.QUALIFIED })
      .expect(200);
    const scoreResponse = await request(httpServer)
      .patch(`/leads/${lead.id}/score`)
      .send({ score: 42 })
      .expect(200);

    expect((statusResponse.body as LeadResponseBody).status).toBe(LeadStatus.QUALIFIED);
    expect((scoreResponse.body as LeadResponseBody).score).toBe(42);
  });

  it('returns not found when lead does not exist', async () => {
    const httpServer = app.getHttpServer() as Server;

    await request(httpServer).get(`/leads/${randomUUID()}`).expect(404);
  });

  it('rejects negative score', async () => {
    const httpServer = app.getHttpServer() as Server;
    const lead = await leadsRepository.create(
      Lead.create({
        id: randomUUID(),
        organizationId: organization.id,
        email: 'candidate@example.com',
      }),
    );

    await request(httpServer).patch(`/leads/${lead.id}/score`).send({ score: -1 }).expect(400);
  });
});
