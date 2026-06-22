import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export function configureOpenApi(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('EduFlow Marketing Automation API')
    .setDescription(
      'Event-driven marketing automation platform for academic campaigns, lead tracking, outbox processing and automation flows.',
    )
    .setVersion('1.0.0')
    .addTag('Organizations', 'Organization management')
    .addTag('Campaigns', 'Academic campaign management')
    .addTag('Leads', 'Lead capture, scoring and lifecycle management')
    .addTag('Lead Events', 'Idempotent behavioral event ingestion')
    .addTag('Automations', 'Automation flow configuration and evaluation')
    .addTag('Outbox', 'Transactional Outbox inspection and publishing')
    .addTag('Dead Letter', 'Failed asynchronous delivery inspection')
    .addTag('Health', 'Application health and observability endpoints')
    .build();

  const document = SwaggerModule.createDocument(app, config);

  SwaggerModule.setup('docs', app, document, {
    jsonDocumentUrl: 'docs-json',
    swaggerOptions: {
      displayRequestDuration: true,
      persistAuthorization: true,
    },
  });
}
