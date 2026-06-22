# Portfolio Deployment

## Decision

EduFlow uses Render and CloudAMQP as the active public-demo deployment strategy.

The project exists exclusively as a backend engineering portfolio project. Render provides the
public Web Service and PostgreSQL, while CloudAMQP preserves the RabbitMQ-based event-driven
architecture without operating a broker inside Render.

Azure is not an active deployment target. It may be revisited only as a future infrastructure
exercise, and no Azure provisioning code is maintained as part of the current strategy.

## Status

The first real Render deployment has not been recorded in the repository yet.

```txt
Public API URL: TODO
Deploy validated: TODO
CloudAMQP validated: TODO
Migrations applied: TODO
API health validated: TODO
Workers validated: TODO
Outbox validated: TODO
Automation validated: TODO
```

Until those fields are replaced with observed evidence, the deployment documentation is a runbook,
not a claim that the public demo is online.

## Public Demo Scope

The intended remote architecture is:

- `eduflow-api` as a Render Web Service;
- `eduflow-postgres` as Render PostgreSQL;
- CloudAMQP as external RabbitMQ;
- `eduflow-outbox-worker` and `eduflow-automation-worker` as optional paid Render Background
  Workers;
- GHCR as the registry for versioned Docker images.

The repository Blueprint builds the Dockerfile directly from source. The GHCR publication workflow
remains available as release evidence and as an alternative manual image source.

## Observed and Expected Limitations

No provider limitation has been marked as observed in a completed EduFlow deployment yet. The
following documented provider constraints must be expected and verified during execution:

- a Render Free Web Service spins down after 15 minutes without inbound traffic;
- waking a Free Web Service can take about a minute;
- Render Background Workers do not support the Free instance type and can incur charges;
- a Free Render Postgres database expires 30 days after creation;
- a Render workspace can have only one active Free Postgres database;
- Free services have monthly usage, bandwidth and build limits;
- CloudAMQP free or shared plans limit connections, channels, queues, throughput, transfer or
  storage according to the selected plan;
- provider logs and retained demo data are limited and are not guaranteed;
- the public demo has no high availability, disaster recovery, private networking or production
  service-level objective.

After the first deployment, move only confirmed items into the evidence record:

```txt
Observed cold start: TODO
Observed deploy duration: TODO
Observed database expiration date: TODO
Observed worker cost/plan: TODO
Observed CloudAMQP quota: TODO
Other observed limitation: TODO
```

## Cost-Controlled Modes

### Complete remote demo

Deploy the API, PostgreSQL, CloudAMQP and both paid Background Workers. This mode can demonstrate
the full Outbox and Automation flow remotely, but it can incur Render worker charges.

### API-only remote demo

Deploy only the Free API and temporary PostgreSQL, with CloudAMQP connectivity used by readiness.
Keep workers suspended or uncreated. This mode validates the public HTTP API and persistence but
must not be described as a successful remote asynchronous automation deployment.

### Complete local demo

Docker Compose remains the authoritative complete stack:

```bash
npm run docker:build
npm run docker:up
```

It runs PostgreSQL, Redis, RabbitMQ and its management interface, Prisma migrations, the API, the
Outbox Publisher Worker and the Automation Worker.

## Data and Security Boundaries

The public environment must use only synthetic demonstration data. It must not receive real
student, candidate, customer, organization or personal data.

Secrets must stay in provider secret settings or trusted local session variables:

- `DATABASE_URL` comes from Render Postgres;
- `RABBITMQ_URL` comes from CloudAMQP;
- neither value is committed to Git;
- `.env.example` documents names and local-only examples, not remote credentials.

If a credential appears in Git history, logs, screenshots, issues or pull requests, rotate it
immediately.

## Production Disclaimer

EduFlow is not operated as a production service. The public demo does not claim production-grade:

- availability or scaling;
- backup and restore;
- security hardening;
- automated secret rotation;
- incident response;
- data retention;
- regulatory compliance;
- complete monitoring coverage.

## Validation Record

The deploy is considered demonstrated only when evidence exists for:

1. successful Prisma migration deployment;
2. `/health/live`, `/health/ready`, `/health` and `/metrics`;
3. creation of an Organization, Campaign and Lead;
4. creation and activation of an Automation;
5. creation of a matching LeadEvent;
6. OutboxMessage transition to `PUBLISHED`;
7. worker publication and consumption logs;
8. expected lead score and status changes.

Use [Render Deployment](render-deployment.md) for the execution runbook and
[CloudAMQP](cloudamqp.md) for broker inspection.
