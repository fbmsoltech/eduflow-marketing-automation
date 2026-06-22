# Deployment Strategy

## Overview

EduFlow uses Render and CloudAMQP as its active public-demo deployment strategy:

- Render Web Service for the NestJS API;
- Render PostgreSQL for transactional persistence;
- CloudAMQP as the external RabbitMQ broker;
- optional Render Background Workers for Outbox publication and Automation processing;
- GHCR for versioned Docker images.

The remote environment is a limited technical portfolio demo, not a production stage. Docker
Compose remains the authoritative way to run the complete system locally.

## Why Render and CloudAMQP

EduFlow exists exclusively as a portfolio project. The original Azure direction was replaced to
reduce recurring cost and infrastructure complexity while retaining the architecture the project
is intended to demonstrate.

Render provides a small public HTTP surface and managed PostgreSQL. CloudAMQP preserves the
RabbitMQ-based event pipeline without operating a broker inside Render.

Azure is not an active deployment strategy and no Azure infrastructure is provisioned by this
repository.

## Environment Strategy

### Complete local environment

Docker Compose runs:

- PostgreSQL;
- Redis;
- RabbitMQ and its Management UI;
- committed Prisma migrations;
- NestJS API;
- Outbox Publisher Worker;
- Automation Worker.

```bash
npm run docker:build
npm run docker:up
```

This is the reference environment for demonstrating the complete event-driven flow without paid
cloud worker capacity.

### API-only public demo

The cost-controlled public mode can run:

- `eduflow-api` on Render;
- `eduflow-postgres` on Render;
- CloudAMQP connectivity for readiness and diagnostic publication.

If the Background Workers are suspended or not created, the deployment must be described as an
API and persistence demo. It must not be presented as a complete remote automation pipeline.

### Complete remote demo

The full remote flow adds:

- `eduflow-outbox-worker`;
- `eduflow-automation-worker`.

Render Background Workers do not use the Free Web Service plan and can incur charges. The selected
plans must be reviewed before applying the Blueprint.

## Runtime Architecture

```txt
Client
  |
  v
Render Web Service: eduflow-api
  |
  +--> Render PostgreSQL
  |
  +--> CloudAMQP readiness check

Render Worker: eduflow-outbox-worker
  |
  +--> PostgreSQL Outbox Messages
  +--> CloudAMQP exchange

Render Worker: eduflow-automation-worker
  |
  +--> CloudAMQP queue
  +--> PostgreSQL automation state
```

## Render Blueprint

The repository-root `render.yaml` defines:

| Resource                    | Render type       | Purpose                       |
| --------------------------- | ----------------- | ----------------------------- |
| `eduflow-api`               | Web Service       | Public NestJS API             |
| `eduflow-outbox-worker`     | Background Worker | Publishes pending outbox rows |
| `eduflow-automation-worker` | Background Worker | Consumes and evaluates events |
| `eduflow-postgres`          | PostgreSQL        | Transactional database        |

The Blueprint builds the existing multi-stage `Dockerfile`. It does not store real database,
RabbitMQ or Redis credentials.

## CloudAMQP

CloudAMQP supplies the external `RABBITMQ_URL` used by the Render services. The expected topology
is:

```txt
Exchange: eduflow.events
Type: topic
Queue: eduflow.automation.events
Binding: lead-events.#
```

The complete `amqps://` connection URL is a secret and belongs only in provider environment
settings. See [CloudAMQP](cloudamqp.md).

## Database Migrations

Only committed Prisma migrations should be applied remotely:

```bash
npm run prisma:migrate:deploy
```

Never use `prisma migrate dev` against the Render database. The current Free deployment runbook
applies migrations from a trusted local session because the runtime image intentionally excludes
the Prisma CLI and migration sources.

See [Render Deployment](render-deployment.md) for the exact procedure.

## Continuous Integration

GitHub Actions validates pull requests and pushes targeting `develop` or `main`.

The CI workflow:

1. uses Node.js 22;
2. starts PostgreSQL 16, Redis 7 and RabbitMQ 3 service containers;
3. installs dependencies with `npm ci`;
4. generates Prisma Client and applies committed migrations;
5. runs lint, formatting checks, unit tests, end-to-end tests and the TypeScript build.

The worker loops are disabled during CI so validation remains deterministic.

## Container Images

The `Docker Build` workflow validates that the repository image builds successfully without
publishing it.

The `Docker Publish` workflow publishes images to:

```txt
ghcr.io/fbmsoltech/eduflow-marketing-automation
```

Publication runs for:

- pushes to `main`;
- semantic version tags matching `v*.*.*`;
- manual `workflow_dispatch` executions.

Published metadata includes branch or tag information, semantic versions, a commit SHA tag and
`latest` only on the default branch.

Render currently builds the same Dockerfile directly from source. GHCR remains release evidence
and an alternative manually selected image source.

## Deployment Flow

1. Validate the selected branch through GitHub Actions.
2. Create or verify the CloudAMQP instance.
3. Apply or sync `render.yaml`.
4. Enter `RABBITMQ_URL` in Render secret settings.
5. Let Render inject `DATABASE_URL`.
6. Apply committed Prisma migrations from a trusted environment.
7. Validate `/health/live`, `/health/ready`, `/health` and `/metrics`.
8. Run the API smoke flow.
9. If both workers are active, validate Outbox publication, broker consumption and automation
   results.
10. Record only observed evidence; do not publish an assumed URL.

## Secrets

Never commit:

- `DATABASE_URL`;
- CloudAMQP `RABBITMQ_URL`;
- `REDIS_URL` containing remote credentials;
- registry tokens;
- copied provider environment exports;
- logs or screenshots that expose credentials.

`.env.example` documents variable names and safe local defaults only.

## Limitations

The public demo is intentionally free or low-cost and limited:

- a Render Free Web Service can sleep while idle and cold-start on the next request;
- free database availability, retention and quotas are provider-controlled;
- Render Background Workers can incur charges;
- CloudAMQP shared plans have connection, channel, queue, throughput and storage limits;
- the demo has no production availability, backup, disaster recovery or service-level objective;
- only synthetic data should be used.

Provider plan names and limits can change. Confirm current values in provider dashboards before
creating resources.

## Rollback

The intended rollback strategy uses:

- immutable GHCR tags;
- reviewed Prisma migrations;
- versioned releases;
- a previously validated container image;
- documented manual provider steps.

Database rollback is not implied by redeploying an older application image and must be evaluated
separately.

## Deployment Status

Phase 22 added the first Render deployment runbook. The repository does not currently contain a
validated public URL or completed evidence record, so the documentation must be treated as an
execution guide rather than proof that the demo is online.

See:

- [Render Deployment](render-deployment.md)
- [CloudAMQP](cloudamqp.md)
- [Portfolio Deployment](portfolio-deployment.md)
- [API Examples](api-examples.md)
