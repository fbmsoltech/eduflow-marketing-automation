# Portfolio Deployment

## Decision

EduFlow uses Render and CloudAMQP as the active deployment strategy for its public portfolio demo.

The project is exclusively a backend engineering portfolio case study. Render provides the public
API and PostgreSQL, while CloudAMQP provides external RabbitMQ without adding the cost and
operational work of a larger cloud platform.

Azure was replaced as the active strategy to reduce cost and complexity. It is not provisioned or
maintained by this repository and should not be described as the current deployment target.

## Current Evidence

The repository does not contain a validated public URL or completed deployment evidence.

```txt
Public API URL: RENDER_API_URL
Deploy validated: PENDING
CloudAMQP validated: PENDING
Migrations applied: PENDING
API health validated: PENDING
Workers validated: PENDING
Outbox validated: PENDING
Automation validated: PENDING
```

`RENDER_API_URL` is a placeholder, not a claim that the public service is available. Replace it
only after verification through the Render dashboard and an HTTP request.

## Public Demo Modes

### API-only remote demo

This cost-controlled mode runs the API and PostgreSQL publicly. CloudAMQP can be configured for
readiness checks and diagnostic publication, while paid Background Workers remain suspended or
uncreated.

It demonstrates:

- public HTTP access;
- request validation and use cases;
- PostgreSQL persistence;
- LeadEvent and Outbox creation;
- health and metrics endpoints.

It does not demonstrate automatic remote Outbox publication or Automation consumption.

### Complete remote demo

This mode adds the Outbox Publisher Worker and Automation Worker on Render.

It demonstrates:

- automatic Outbox polling;
- RabbitMQ publication through CloudAMQP;
- topic routing and message consumption;
- Automation Engine execution;
- score, status, task and webhook actions.

Render Background Workers can incur charges, so this mode is optional for the portfolio.

### Complete local demo

Docker Compose is the authoritative complete environment:

```bash
npm run docker:build
npm run docker:up
```

It runs PostgreSQL, Redis, RabbitMQ, migrations, the API and both workers without depending on paid
remote worker capacity.

## Demo Limitations

The public deployment is free or low-cost by design and is not production:

- a Render Free Web Service may sleep while idle;
- the first request after an idle period may experience a cold start;
- free database retention and availability are limited;
- Background Workers require a reviewed paid plan;
- CloudAMQP free or shared plans impose provider-specific quotas;
- logs and demonstration data can be temporary;
- no high availability, disaster recovery or production service-level objective is claimed.

Plan details can change. Record a limit as observed only after confirming it in the provider
dashboard or deployment behavior.

## Data and Security Boundaries

Use only synthetic data in the public environment. Do not submit real student, candidate, customer,
organization or personal data.

Secrets belong in provider settings or trusted local session variables:

- Render injects `DATABASE_URL`;
- CloudAMQP supplies `RABBITMQ_URL`;
- `.env.example` contains local-only examples;
- no remote credential should appear in Git, documentation, logs, screenshots, issues or pull
  requests.

Rotate any credential that may have been exposed.

## Validation Criteria

The API-only demo is validated when there is evidence for:

1. successful deployment and committed Prisma migrations;
2. `/health/live`, `/health/ready`, `/health` and `/metrics`;
3. Organization, Campaign and Lead creation;
4. LeadEvent and OutboxMessage creation.

The complete remote demo additionally requires:

1. OutboxMessage transition to `PUBLISHED`;
2. successful CloudAMQP routing;
3. Automation Worker consumption;
4. successful AutomationExecution;
5. expected lead score or status changes;
6. worker logs correlated with the test event.

The optional Google Meet interview demo additionally requires external Apps Script evidence:

1. Apps Script Web App deployed without committing its real URL;
2. Google Calendar API enabled in Apps Script;
3. `SEND_WEBHOOK` delivery to the Web App;
4. Calendar event created with Google Meet;
5. synthetic candidate mailbox receiving the invite.

See [Google Meet Interview Webhook](google-meet-interview-webhook.md). This integration does not
change the Render or CloudAMQP deployment strategy.

Use [API Examples](api-examples.md) for the functional walkthrough.

## Evidence Template

Complete this only with observed, non-sensitive data:

```txt
Execution date:
Git commit:
Public API URL:
Render plans and region:
CloudAMQP plan and region:
Migration result:
/health/live:
/health/ready:
/health:
/metrics:
API flow:
Outbox publication:
Automation consumption:
Lead result:
Observed cold start:
Observed provider limits:
```

Do not include database URLs, broker hostnames, usernames, passwords, virtual hosts or tokens.

## Production Disclaimer

EduFlow is not operated as a production service. The public demo does not claim production-grade:

- availability or autoscaling guarantees;
- backup and restore;
- security hardening or secret rotation;
- incident response;
- data retention or regulatory compliance;
- complete monitoring coverage.

See [Render Deployment](render-deployment.md) for the runbook and
[CloudAMQP](cloudamqp.md) for broker validation.
