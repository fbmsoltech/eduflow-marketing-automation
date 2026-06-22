import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaHealthIndicator } from '@nestjs/terminus';
import type { Server } from 'node:http';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/infrastructure/prisma/prisma.service';
import { configureOpenApi } from '../src/openapi';
import { RabbitMQHealthIndicator } from '../src/presentation/health/rabbitmq-health.indicator';

interface OpenApiDocument {
  info: {
    title: string;
    version: string;
  };
  tags: Array<{ name: string }>;
  paths: Record<
    string,
    Record<
      string,
      {
        tags?: string[];
        summary?: string;
        requestBody?: unknown;
        responses?: Record<string, unknown>;
      }
    >
  >;
  components: {
    schemas: Record<
      string,
      {
        properties?: Record<string, { example?: unknown }>;
      }
    >;
  };
}

describe('OpenAPI documentation', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue({
        $connect: () => Promise.resolve(),
        $disconnect: () => Promise.resolve(),
      })
      .overrideProvider(PrismaHealthIndicator)
      .useValue({
        pingCheck: jest.fn().mockResolvedValue({ database: { status: 'up' } }),
      })
      .overrideProvider(RabbitMQHealthIndicator)
      .useValue({
        isHealthy: jest.fn().mockResolvedValue({ rabbitmq: { status: 'up' } }),
      })
      .compile();

    app = moduleRef.createNestApplication();
    configureOpenApi(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('serves the Swagger UI', async () => {
    const httpServer = app.getHttpServer() as Server;

    await request(httpServer)
      .get('/docs')
      .expect(200)
      .expect('content-type', /text\/html/)
      .expect((response) => {
        expect(response.text).toContain('Swagger UI');
      });
  });

  it('publishes the expected OpenAPI metadata, tags, paths and schemas', async () => {
    const httpServer = app.getHttpServer() as Server;
    const response = await request(httpServer).get('/docs-json').expect(200);
    const document = response.body as OpenApiDocument;

    expect(document.info).toEqual(
      expect.objectContaining({
        title: 'EduFlow Marketing Automation API',
        version: '1.0.0',
      }),
    );

    expect(document.tags.map((tag) => tag.name)).toEqual(
      expect.arrayContaining([
        'Organizations',
        'Campaigns',
        'Leads',
        'Lead Events',
        'Automations',
        'Outbox',
        'Dead Letter',
        'Health',
      ]),
    );

    expect(Object.keys(document.paths)).toEqual(
      expect.arrayContaining([
        '/organizations',
        '/organizations/{id}',
        '/campaigns',
        '/campaigns/{id}',
        '/organizations/{organizationId}/campaigns',
        '/campaigns/{id}/status',
        '/leads',
        '/leads/{id}',
        '/organizations/{organizationId}/leads',
        '/campaigns/{campaignId}/leads',
        '/leads/{id}/status',
        '/leads/{id}/score',
        '/lead-events',
        '/lead-events/{id}',
        '/organizations/{organizationId}/lead-events',
        '/campaigns/{campaignId}/lead-events',
        '/leads/{leadId}/lead-events',
        '/automations',
        '/automations/evaluate',
        '/automations/{id}',
        '/organizations/{organizationId}/automations',
        '/campaigns/{campaignId}/automations',
        '/automations/{id}/status',
        '/outbox/messages',
        '/outbox/messages/{id}',
        '/outbox/messages/publish',
        '/dead-letter/messages',
        '/dead-letter/messages/{id}',
        '/dead-letter/messages/{id}/ignore',
        '/health',
        '/health/live',
        '/health/ready',
        '/metrics',
      ]),
    );

    expect(Object.keys(document.components.schemas)).toEqual(
      expect.arrayContaining([
        'CreateOrganizationDto',
        'CreateCampaignDto',
        'CreateLeadDto',
        'RegisterLeadEventDto',
        'CreateAutomationFlowDto',
        'UpdateAutomationFlowStatusDto',
        'PublishOutboxMessagesDto',
        'OrganizationResponseDto',
        'CampaignResponseDto',
        'LeadResponseDto',
        'LeadEventResponseDto',
        'AutomationFlowResponseDto',
        'OutboxMessageResponseDto',
        'DeadLetterMessageResponseDto',
      ]),
    );

    expect(
      document.components.schemas['CreateOrganizationDto']?.properties?.['name']?.example,
    ).toBe('Academic League');
    expect(document.components.schemas['CreateCampaignDto']?.properties?.['name']?.example).toBe(
      'Selection Process 2026',
    );
    expect(document.components.schemas['CreateLeadDto']?.properties?.['email']?.example).toBe(
      'ana@example.com',
    );
    expect(
      document.components.schemas['RegisterLeadEventDto']?.properties?.['eventType']?.example,
    ).toBe('email.clicked');
    expect(
      document.components.schemas['CreateAutomationFlowDto']?.properties?.['name']?.example,
    ).toBe('Qualify engaged candidate');
    expect(
      document.components.schemas['UpdateAutomationFlowStatusDto']?.properties?.['status']?.example,
    ).toBe('ACTIVE');
    expect(
      document.components.schemas['PublishOutboxMessagesDto']?.properties?.['limit']?.example,
    ).toBe(10);

    expect(document.paths['/organizations']?.['post']).toEqual(
      expect.objectContaining({
        tags: ['Organizations'],
        summary: 'Create Organization',
      }),
    );
    expect(document.paths['/organizations']?.['post']?.requestBody).toBeDefined();
    expect(document.paths['/automations']?.['post']).toEqual(
      expect.objectContaining({
        tags: ['Automations'],
        summary: 'Create Automation',
      }),
    );
    expect(document.paths['/automations']?.['post']?.requestBody).toBeDefined();
    expect(document.paths['/outbox/messages/publish']?.['post']).toEqual(
      expect.objectContaining({
        summary: 'Publish Outbox Messages',
      }),
    );
    expect(document.paths['/outbox/messages/publish']?.['post']?.requestBody).toBeDefined();
    expect(document.paths['/dead-letter/messages/{id}/ignore']?.['patch']?.summary).toBe(
      'Ignore Dead Letter Message',
    );
    expect(Object.keys(document.paths['/organizations']?.['post']?.responses ?? {})).toEqual(
      expect.arrayContaining(['201', '400', '409', '500']),
    );
    expect(Object.keys(document.paths['/organizations/{id}']?.['get']?.responses ?? {})).toEqual(
      expect.arrayContaining(['200', '404', '500']),
    );
  });
});
