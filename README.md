# EduFlow Marketing Automation

EduFlow is an event-driven marketing automation platform designed for academic campaigns, selection processes, courses and community events.

The project simulates a real-world scenario where organizations need to capture leads, track behavioral events, evaluate automation rules, update lead scores, create tasks and dispatch integrations asynchronously.

## Current Status

Local infrastructure phase.

## Business Case

Academic organizations, courses and communities often run campaigns to attract candidates, students or participants.

Most of the follow-up process is manual: confirming registrations, reminding candidates, identifying engaged leads, creating follow-up tasks and tracking conversion metrics.

EduFlow provides a marketing automation engine where each lead interaction can trigger rules and actions asynchronously.

## Main Goals

- Build a real-world backend portfolio project.
- Demonstrate event-driven architecture.
- Apply Clean Architecture principles.
- Use asynchronous processing with message queues.
- Implement idempotency, retry and dead-letter queues.
- Add observability with logs, metrics and traces.
- Deploy using a cloud-native approach.

## Tech Stack

- Node.js
- TypeScript
- NestJS
- PostgreSQL
- Prisma
- Redis
- RabbitMQ
- Docker
- Jest
- GitHub Actions
- Azure Container Apps

## Documentation

- [Architecture](docs/architecture.md)
- [GitFlow Strategy](docs/gitflow.md)
- [Deployment Strategy](docs/deployment.md)
- [Local Development](docs/local-development.md)
- [Azure Container Apps Deployment](docs/azure-deployment.md)
- [Azure Secrets](docs/azure-secrets.md)
- [Azure Deployment Runbook](docs/azure-runbook.md)

## Architecture Decision Records

- [0001 - Use TypeScript and NestJS](docs/decisions/0001-use-typescript-nestjs.md)
- [0002 - Use Event-Driven Architecture](docs/decisions/0002-use-event-driven-architecture.md)
- [0003 - Use Outbox Pattern](docs/decisions/0003-use-outbox-pattern.md)

## Local API

Install dependencies:

```bash
npm install
```

Run the API locally:

```bash
npm run start:dev
```

The health endpoint is available at:

```txt
GET /health
```

## Local Infrastructure

Start PostgreSQL, Redis and RabbitMQ:

```bash
npm run infra:up
```

Check service status:

```bash
npm run infra:ps
```

RabbitMQ Management UI is available at:

```txt
http://localhost:15672
```

Default local credentials are documented in `.env.example`.

## Database

Copy the example environment file before running Prisma commands:

```bash
cp .env.example .env
```

Generate Prisma Client:

```bash
npm run prisma:generate
```

Apply database migrations to the local PostgreSQL service:

```bash
npm run prisma:migrate:dev
```

Open Prisma Studio:

```bash
npm run prisma:studio
```

Build and test:

```bash
npm run build
npm run lint
npm run test
npm run test:e2e
```

Format files:

```bash
npm run format
```

## Azure Deployment

Phase 20 prepares a manual deployment to Azure Container Apps using the image published in GHCR.
The API uses external ingress on port `3000`; the Outbox Publisher and Automation workers run
without ingress; PostgreSQL and Redis use managed Azure services; RabbitMQ remains an external
cloud-reachable dependency.

Start with:

```bash
cp infra/azure/env.example infra/azure/env.local
bash infra/azure/create-resources.sh
bash infra/azure/deploy-container-apps.sh
bash infra/azure/run-migrations.sh
```

The current application image is not migration-capable. Configure a dedicated `MIGRATIONS_IMAGE`
before creating or running the Azure Container Apps migration Job. See the
[Azure Deployment Runbook](docs/azure-runbook.md) for prerequisites, secrets, probes, deployment
order and rollback guidance.

## Code Quality

Local commits use Husky hooks.

- `lint-staged` formats and lints staged files before commit.
- `commitlint` validates commit messages using Conventional Commits.
- Prettier and EditorConfig keep formatting consistent across editors.

## Status

This project is under active development.
