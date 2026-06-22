# Deployment Strategy

## Overview

EduFlow Marketing Automation uses containers locally and supports a limited public portfolio demo.
Render is the active remote target, CloudAMQP provides external RabbitMQ, and GHCR stores published
application images.

## Environment Strategy

### Local

Used by developers to run the full stack locally.

Local dependencies:

- PostgreSQL
- Redis
- RabbitMQ
- Prometheus
- Grafana

The local environment will be managed with Docker Compose.

### Public Portfolio Demo

The remote environment is a reviewer-facing demonstration, not a production stage. It can be
deployed manually from a selected repository branch through the Render Blueprint.

The target resources are:

- Render Web Service `eduflow-api`;
- Render Background Worker `eduflow-outbox-worker`;
- Render Background Worker `eduflow-automation-worker`;
- Render PostgreSQL or an external PostgreSQL-compatible database;
- CloudAMQP as external RabbitMQ.

The API and database can use free plans with provider limitations. Background workers require paid
Render instances, so a no-cost demo may omit or suspend them and use Docker Compose to demonstrate
the complete asynchronous flow.

## Continuous Integration

GitHub Actions validates pull requests and pushes targeting `develop` or `main`.

The `CI` workflow:

1. Uses Node.js 22 with npm dependency caching.
2. Starts PostgreSQL 16, Redis 7 and RabbitMQ 3 service containers.
3. Installs dependencies with `npm ci`.
4. Generates Prisma Client and applies existing migrations.
5. Runs lint, formatting checks, unit tests, end-to-end tests and the TypeScript build.

The CI environment disables the Outbox Publisher and Automation Worker loops. The service
containers are available to validation commands, but the workflow does not start long-running
application or worker processes.

The `Docker Build` workflow uses Docker Buildx to build the repository `Dockerfile` with the local
tag `eduflow-marketing-automation:ci`. The image is loaded only into the workflow runner and is not
published to a registry.

## Container Image Publication

The `Docker Publish` workflow publishes the production application image to GitHub Container
Registry:

```txt
ghcr.io/fbmsoltech/eduflow-marketing-automation
```

Publication runs only for pushes to `main`, semantic version tags matching `v*.*.*` and manual
`workflow_dispatch` executions. Pull requests continue to use the separate `Docker Build` workflow,
which never pushes images.

The workflow authenticates to `ghcr.io` with the repository-scoped `GITHUB_TOKEN`. Its permissions
are limited to reading repository contents and writing packages. No production secret is required
for image publication.

Published tags include:

- the source branch for branch events;
- the Git tag for tag events;
- the normalized semantic version for version tags;
- a `sha-` tag for traceability;
- `latest` only when the workflow runs from the repository default branch.

Docker metadata also supplies OCI labels during publication. The Dockerfile defines the image
title, description, source repository and MIT license so locally built images carry the same core
provenance information.

Published images remain immutable deployment artifacts and portfolio evidence. The repository
Blueprint builds the same Dockerfile directly from source. GHCR can also be selected manually as a
prebuilt-image source in Render.

## Deployment Flow

### Render Demo

1. Validate the branch in GitHub Actions.
2. Apply or sync `render.yaml` in Render.
3. Enter `RABBITMQ_URL` as a secret.
4. Let Render inject `DATABASE_URL` from the Blueprint database.
5. Apply committed Prisma migrations from a trusted environment.
6. Deploy the API and, when paid worker capacity is desired, both workers.
7. Validate `/health/live`, `/health/ready`, `/health` and `/metrics`.
8. Run the minimum API and asynchronous smoke flow.

## Rollback Strategy

The rollback strategy will be based on:

- Immutable Docker image tags
- Database migration review
- Versioned releases
- Previous stable container image
- Documented manual rollback steps

## Secrets Strategy

Secrets must not be committed to the repository.

Secrets are managed using:

- `.env.example` for local variable names and non-secret examples;
- GitHub Actions secrets when a workflow needs credentials;
- Render secret environment variables for deployment URLs;
- CloudAMQP's console for RabbitMQ credentials.

Real `DATABASE_URL`, `RABBITMQ_URL`, `REDIS_URL` and registry tokens must never be committed.

## Deployment Status

Current status:

- Continuous integration is implemented for pull requests and pushes to `develop` and `main`.
- Docker image builds are validated without publishing images.
- Production application images are published to GitHub Container Registry from `main`, version
  tags and manual workflow executions.
- `render.yaml` defines the API, both workers and PostgreSQL.
- Render and CloudAMQP are the active Deployment direction.
- The public environment is explicitly limited and not production.
- Docker Compose remains the complete local reference environment.

See [Render Deployment](render-deployment.md), [CloudAMQP](cloudamqp.md) and
[Deployment](portfolio-deployment.md).
