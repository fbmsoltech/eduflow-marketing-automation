import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import type { Server } from 'node:http';
import request from 'supertest';
import { OrganizationsRepository } from '../src/application/organizations/organizations.repository';
import { ORGANIZATIONS_REPOSITORY } from '../src/application/organizations/organizations.repository';
import { Organization } from '../src/domain/organizations/organization.entity';
import { PrismaService } from '../src/infrastructure/prisma/prisma.service';
import { AppModule } from '../src/app.module';

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

interface OrganizationResponseBody {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isOrganizationResponseBody(value: unknown): value is OrganizationResponseBody {
  return (
    isRecord(value) &&
    typeof value['id'] === 'string' &&
    typeof value['name'] === 'string' &&
    typeof value['slug'] === 'string' &&
    typeof value['createdAt'] === 'string' &&
    typeof value['updatedAt'] === 'string'
  );
}

describe('Organizations endpoints', () => {
  let app: INestApplication;
  let repository: InMemoryOrganizationsRepository;

  beforeEach(async () => {
    repository = new InMemoryOrganizationsRepository();

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(ORGANIZATIONS_REPOSITORY)
      .useValue(repository)
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

  it('creates an organization', async () => {
    const httpServer = app.getHttpServer() as Server;

    const response = await request(httpServer)
      .post('/organizations')
      .send({
        name: 'EduFlow University',
        slug: 'eduflow-university',
      })
      .expect(201);

    const body: unknown = response.body;

    expect(isOrganizationResponseBody(body)).toBe(true);

    if (!isOrganizationResponseBody(body)) {
      throw new Error('Expected organization response body');
    }

    expect(body.name).toBe('EduFlow University');
    expect(body.slug).toBe('eduflow-university');
  });

  it('returns conflict when slug already exists', async () => {
    const httpServer = app.getHttpServer() as Server;

    await request(httpServer).post('/organizations').send({
      name: 'EduFlow University',
      slug: 'eduflow-university',
    });

    await request(httpServer)
      .post('/organizations')
      .send({
        name: 'Another EduFlow',
        slug: 'eduflow-university',
      })
      .expect(409);
  });

  it('lists organizations', async () => {
    const httpServer = app.getHttpServer() as Server;

    await request(httpServer).post('/organizations').send({
      name: 'EduFlow University',
      slug: 'eduflow-university',
    });

    const response = await request(httpServer).get('/organizations').expect(200);

    const body: unknown = response.body;

    expect(Array.isArray(body)).toBe(true);

    if (!Array.isArray(body) || !isOrganizationResponseBody(body[0])) {
      throw new Error('Expected organization response list');
    }

    expect(body[0].name).toBe('EduFlow University');
    expect(body[0].slug).toBe('eduflow-university');
  });

  it('finds an organization by id', async () => {
    const httpServer = app.getHttpServer() as Server;
    const organization = await repository.create(
      Organization.create({
        id: randomUUID(),
        name: 'EduFlow University',
        slug: 'eduflow-university',
      }),
    );

    const response = await request(httpServer).get(`/organizations/${organization.id}`).expect(200);

    expect(response.body as unknown).toEqual({
      id: organization.id,
      name: 'EduFlow University',
      slug: 'eduflow-university',
      createdAt: organization.createdAt.toISOString(),
      updatedAt: organization.updatedAt.toISOString(),
    });
  });

  it('returns not found when organization does not exist', async () => {
    const httpServer = app.getHttpServer() as Server;

    await request(httpServer)
      .get('/organizations/681f0ad2-8270-4897-a268-01853dc18756')
      .expect(404);
  });
});
