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
  ORGANIZATIONS_REPOSITORY,
  OrganizationsRepository,
} from '../src/application/organizations/organizations.repository';
import { AppModule } from '../src/app.module';
import { Campaign, CampaignStatus } from '../src/domain/campaigns/campaign.entity';
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

interface CampaignResponseBody {
  id: string;
  organizationId: string;
  name: string;
  slug: string;
  status: CampaignStatus;
  startsAt?: string;
  endsAt?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isCampaignResponseBody(value: unknown): value is CampaignResponseBody {
  return (
    isRecord(value) &&
    typeof value['id'] === 'string' &&
    typeof value['organizationId'] === 'string' &&
    typeof value['name'] === 'string' &&
    typeof value['slug'] === 'string' &&
    typeof value['status'] === 'string' &&
    typeof value['createdAt'] === 'string' &&
    typeof value['updatedAt'] === 'string'
  );
}

describe('Campaigns endpoints', () => {
  let app: INestApplication;
  let organizationsRepository: InMemoryOrganizationsRepository;
  let campaignsRepository: InMemoryCampaignsRepository;
  let organization: Organization;

  beforeEach(async () => {
    organizationsRepository = new InMemoryOrganizationsRepository();
    campaignsRepository = new InMemoryCampaignsRepository();
    organization = await organizationsRepository.create(
      Organization.create({
        id: randomUUID(),
        name: 'EduFlow University',
        slug: 'eduflow-university',
      }),
    );

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(ORGANIZATIONS_REPOSITORY)
      .useValue(organizationsRepository)
      .overrideProvider(CAMPAIGNS_REPOSITORY)
      .useValue(campaignsRepository)
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

  it('creates a campaign', async () => {
    const httpServer = app.getHttpServer() as Server;

    const response = await request(httpServer)
      .post('/campaigns')
      .send({
        organizationId: organization.id,
        name: 'Selection Process 2026',
        slug: 'selection-process-2026',
        startsAt: '2026-06-01T00:00:00.000Z',
        endsAt: '2026-07-01T00:00:00.000Z',
        metadata: { channel: 'website' },
      })
      .expect(201);

    const body: unknown = response.body;

    expect(isCampaignResponseBody(body)).toBe(true);

    if (!isCampaignResponseBody(body)) {
      throw new Error('Expected campaign response body');
    }

    expect(body.organizationId).toBe(organization.id);
    expect(body.name).toBe('Selection Process 2026');
    expect(body.slug).toBe('selection-process-2026');
    expect(body.status).toBe(CampaignStatus.DRAFT);
    expect(body.startsAt).toBe('2026-06-01T00:00:00.000Z');
    expect(body.endsAt).toBe('2026-07-01T00:00:00.000Z');
    expect(body.metadata).toEqual({ channel: 'website' });
  });

  it('returns conflict when campaign slug already exists in organization', async () => {
    const httpServer = app.getHttpServer() as Server;

    await request(httpServer).post('/campaigns').send({
      organizationId: organization.id,
      name: 'Selection Process 2026',
      slug: 'selection-process-2026',
    });

    await request(httpServer)
      .post('/campaigns')
      .send({
        organizationId: organization.id,
        name: 'Another Selection Process',
        slug: 'selection-process-2026',
      })
      .expect(409);
  });

  it('returns not found when organization does not exist', async () => {
    const httpServer = app.getHttpServer() as Server;

    await request(httpServer)
      .post('/campaigns')
      .send({
        organizationId: randomUUID(),
        name: 'Selection Process 2026',
        slug: 'selection-process-2026',
      })
      .expect(404);
  });

  it('lists campaigns', async () => {
    const httpServer = app.getHttpServer() as Server;

    await request(httpServer).post('/campaigns').send({
      organizationId: organization.id,
      name: 'Selection Process 2026',
      slug: 'selection-process-2026',
    });

    const response = await request(httpServer).get('/campaigns').expect(200);
    const body: unknown = response.body;

    expect(Array.isArray(body)).toBe(true);

    if (!Array.isArray(body) || !isCampaignResponseBody(body[0])) {
      throw new Error('Expected campaign response list');
    }

    expect(body[0].name).toBe('Selection Process 2026');
  });

  it('finds a campaign by id', async () => {
    const httpServer = app.getHttpServer() as Server;
    const campaign = await campaignsRepository.create(
      Campaign.create({
        id: randomUUID(),
        organizationId: organization.id,
        name: 'Selection Process 2026',
        slug: 'selection-process-2026',
      }),
    );

    const response = await request(httpServer).get(`/campaigns/${campaign.id}`).expect(200);

    expect(response.body as unknown).toEqual({
      id: campaign.id,
      organizationId: organization.id,
      name: 'Selection Process 2026',
      slug: 'selection-process-2026',
      status: CampaignStatus.DRAFT,
      createdAt: campaign.createdAt.toISOString(),
      updatedAt: campaign.updatedAt.toISOString(),
    });
  });

  it('lists campaigns by organization', async () => {
    const httpServer = app.getHttpServer() as Server;

    await campaignsRepository.create(
      Campaign.create({
        id: randomUUID(),
        organizationId: organization.id,
        name: 'Selection Process 2026',
        slug: 'selection-process-2026',
      }),
    );

    const response = await request(httpServer)
      .get(`/organizations/${organization.id}/campaigns`)
      .expect(200);

    const body: unknown = response.body;

    expect(Array.isArray(body)).toBe(true);

    if (!Array.isArray(body) || !isCampaignResponseBody(body[0])) {
      throw new Error('Expected campaign response list');
    }

    expect(body[0].organizationId).toBe(organization.id);
  });

  it('updates campaign status', async () => {
    const httpServer = app.getHttpServer() as Server;
    const campaign = await campaignsRepository.create(
      Campaign.create({
        id: randomUUID(),
        organizationId: organization.id,
        name: 'Selection Process 2026',
        slug: 'selection-process-2026',
      }),
    );

    const response = await request(httpServer)
      .patch(`/campaigns/${campaign.id}/status`)
      .send({ status: CampaignStatus.ACTIVE })
      .expect(200);

    const body: unknown = response.body;

    expect(isCampaignResponseBody(body)).toBe(true);

    if (!isCampaignResponseBody(body)) {
      throw new Error('Expected campaign response body');
    }

    expect(body.status).toBe(CampaignStatus.ACTIVE);
  });

  it('returns not found when campaign does not exist', async () => {
    const httpServer = app.getHttpServer() as Server;

    await request(httpServer).get(`/campaigns/${randomUUID()}`).expect(404);
  });
});
