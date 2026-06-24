# EduFlow Marketing Automation

Event-driven backend for automating lead engagement in academic campaigns, courses, community
events and selection processes.

EduFlow is a technical portfolio project built to demonstrate backend engineering practices around
transactional consistency, asynchronous processing, automation rules, observability and
container-based delivery.

## Overview

The platform captures organizations, campaigns, leads and behavioral events. A registered
`LeadEvent` is persisted with an OutboxMessage in the same PostgreSQL transaction, published to
RabbitMQ by a background worker and consumed by the Automation Worker.

Active automation flows can evaluate event, lead, campaign and organization data before running
actions such as:

- increasing or decreasing lead score;
- changing lead status;
- creating follow-up tasks;
- delivering webhooks.

## Live Demo

Public API base URL:

```txt
RENDER_API_URL
```

The repository does not publish an unverified URL. Replace `RENDER_API_URL` only after confirming
the deployed service in Render.

The public environment is an intentionally free or low-cost portfolio demo, not a production
service. A Render Free Web Service may sleep while idle and incur a cold start on the next request.
Render Background Workers require paid capacity, so the public demo may expose only the API and
persistence layer while the complete asynchronous workflow remains available through Docker
Compose.

Useful endpoints:

```txt
GET RENDER_API_URL/health/live
GET RENDER_API_URL/health/ready
GET RENDER_API_URL/health
GET RENDER_API_URL/metrics
```

## Problem

Academic organizations often coordinate candidate and student journeys manually across forms,
email, messaging groups, interviews and follow-up spreadsheets. This makes it difficult to react
consistently to engagement, audit decisions and scale operational work.

## Solution

EduFlow turns lead behavior into events and evaluates configurable automation flows
asynchronously. The API owns transactional writes, the Outbox Pattern protects events from being
lost between PostgreSQL and RabbitMQ, and independent workers publish and process messages.

## Main Features

- Organization, campaign and lead management
- Behavioral LeadEvent registration with idempotency keys
- Campaign-scoped and organization-scoped automation flows
- Condition evaluation using event and domain fields
- Lead score and status automation
- Internal `lead.score.updated` events for score-dependent automations
- Task creation
- Webhook delivery with timeout and retry
- Demonstrative Google Meet interview scheduling through `SEND_WEBHOOK` and Google Apps Script
- Transactional Outbox Pattern
- RabbitMQ topic exchange and background consumers
- Dead Letter persistence for final webhook failures
- Structured JSON logs and correlation IDs
- Liveness, readiness and Prometheus metrics endpoints
- Unit and end-to-end test suites
- Docker Compose full-stack environment
- GitHub Actions validation and GHCR image publication

## Architecture

The codebase follows modular Clean Architecture boundaries:

```txt
Domain
  Entities, business rules and domain types

Application
  Use cases, repository contracts and application services

Infrastructure
  Prisma repositories, RabbitMQ, HTTP clients and observability

Presentation
  NestJS controllers, request DTOs and response DTOs
```

Runtime flow:

```txt
Client / API Consumer
        |
        v
NestJS API
        |
        v
PostgreSQL
        |
        v
Outbox Messages
        |
        v
Outbox Publisher Worker
        |
        v
RabbitMQ / CloudAMQP
        |
        v
Automation Worker
        |
        v
Automation Engine
        |
        v
Lead score/status updates, tasks, webhooks
```

See [Architecture](docs/architecture.md) and the
[Architecture Decision Records](docs/decisions/).

## Tech Stack

| Area            | Technologies                                     |
| --------------- | ------------------------------------------------ |
| Runtime         | Node.js 22, TypeScript                           |
| Framework       | NestJS                                           |
| Database        | PostgreSQL, Prisma                               |
| Messaging       | RabbitMQ locally, CloudAMQP for the public demo  |
| Cache           | Redis in the local reference stack               |
| Testing         | Jest, Supertest                                  |
| Observability   | Pino structured logs, health checks, prom-client |
| Containers      | Docker, Docker Compose                           |
| CI/CD           | GitHub Actions, GHCR                             |
| Demo deployment | Render, Render PostgreSQL, CloudAMQP             |

## Event-Driven Flow

1. The client sends `POST /lead-events` with an idempotency key.
2. The LeadEvent and a `PENDING` OutboxMessage are committed in one PostgreSQL transaction.
3. The Outbox Publisher Worker publishes the message to the durable `eduflow.events` topic
   exchange.
4. The message is routed with `lead-events.<eventType>` to the
   `eduflow.automation.events` queue.
5. The Automation Worker consumes the message and invokes the Automation Engine.
6. Active flows are filtered by organization, campaign and event type.
7. Conditions are evaluated and matching actions are executed.
8. Score-changing actions create an internal `lead.score.updated` LeadEvent and OutboxMessage.
9. The same Outbox and Automation Worker flow can process automations triggered by
   `lead.score.updated`.
10. Webhook actions can merge `config.body` into the outbound payload, including interview
    availability windows for the Google Meet demo.
11. Executions, domain changes and final webhook failures are persisted.
12. Logs, correlation IDs and metrics provide operational evidence.

An idempotent retry using the same organization and `idempotencyKey` returns the existing
LeadEvent without creating another OutboxMessage.

## Technical Highlights

- Event-driven architecture with independently runnable API and workers
- Transactional Outbox Pattern for database-to-broker reliability
- Idempotent event ingestion
- Deterministic internal score-updated events for chained automation rules
- RabbitMQ topic-based routing
- Retry and persisted Dead Letter strategy for webhook failures
- Clean modular architecture with repository contracts
- Use-case-driven application layer and thin controllers
- Structured JSON logs with correlation IDs
- PostgreSQL and RabbitMQ readiness checks
- Prometheus-compatible metrics
- Production-oriented multi-stage Docker image
- Pull request validation and versioned GHCR publication

## Local Development

Requirements:

- Node.js 20 or later
- npm
- Docker with Docker Compose

Install dependencies and create the local environment file:

```bash
npm install
cp .env.example .env
```

On PowerShell:

```powershell
npm install
Copy-Item .env.example .env
```

Start only PostgreSQL, Redis and RabbitMQ:

```bash
npm run infra:up
npm run prisma:generate
npm run prisma:migrate:deploy
npm run start:dev
```

Run workers in separate terminals:

```bash
npm run start:worker:outbox
npm run start:worker:automation
```

See [Local Development](docs/local-development.md) for the complete guide.

## Environment Variables

The committed [.env.example](.env.example) contains local-only defaults. Never commit `.env` or
remote provider credentials.

| Variable                        | Purpose                              |
| ------------------------------- | ------------------------------------ |
| `APP_PORT`                      | API HTTP port                        |
| `NODE_ENV`                      | Runtime environment                  |
| `LOG_LEVEL`                     | Minimum Pino log level               |
| `DATABASE_URL`                  | PostgreSQL connection URL            |
| `REDIS_URL`                     | Redis connection URL                 |
| `RABBITMQ_URL`                  | RabbitMQ or CloudAMQP connection URL |
| `RABBITMQ_EXCHANGE`             | Topic exchange name                  |
| `RABBITMQ_EXCHANGE_TYPE`        | Exchange type                        |
| `OUTBOX_PUBLISHER_ENABLED`      | Enables the publisher loop           |
| `OUTBOX_PUBLISHER_INTERVAL_MS`  | Publisher polling interval           |
| `OUTBOX_PUBLISH_LIMIT`          | Maximum messages processed per cycle |
| `AUTOMATION_WORKER_ENABLED`     | Enables broker consumption           |
| `AUTOMATION_WORKER_QUEUE`       | Automation queue name                |
| `AUTOMATION_WORKER_BINDING_KEY` | RabbitMQ binding pattern             |
| `AUTOMATION_WORKER_PREFETCH`    | Consumer prefetch limit              |
| `WEBHOOK_TIMEOUT_MS`            | Webhook request timeout              |
| `WEBHOOK_MAX_ATTEMPTS`          | Maximum webhook delivery attempts    |
| `WEBHOOK_RETRY_DELAY_MS`        | Delay between webhook attempts       |

## Running with Docker Compose

Docker Compose is the authoritative reference for running the complete workflow locally:

```bash
npm run docker:build
npm run docker:up
npm run docker:ps
```

It starts PostgreSQL, Redis, RabbitMQ, the one-shot Prisma migration service, the API, the Outbox
Publisher Worker and the Automation Worker.

Local endpoints:

```txt
API: http://localhost:3000
RabbitMQ Management: http://localhost:15672
```

Stop the stack:

```bash
npm run docker:down
```

## API Examples

A complete curl walkthrough is available in [API Examples](docs/api-examples.md). It covers:

1. creating an organization, campaign and lead;
2. optionally setting a lead score baseline;
3. creating and activating an automation;
4. registering a matching LeadEvent;
5. inspecting the OutboxMessage;
6. confirming the internal `lead.score.updated` event and OutboxMessage;
7. confirming lead score and status changes;
8. inspecting Dead Letter messages when applicable.

The Google Meet interview scheduling demo is documented in
[Google Meet Interview Webhook](docs/google-meet-interview-webhook.md). It uses `SEND_WEBHOOK` to
call a Google Apps Script Web App, and interview slots are configured in
`actions[].config.body.schedule`.

## API Documentation

Swagger/OpenAPI provides interactive documentation for the REST API:

```txt
Local Swagger UI: http://localhost:3000/docs
Local OpenAPI JSON: http://localhost:3000/docs-json
Public demo: RENDER_API_URL/docs
```

The interface groups endpoints by Organizations, Campaigns, Leads, Lead Events, Automations,
Outbox, Dead Letter and Health. Request and response schemas include realistic examples, enum
values and documented HTTP status codes.

The public URL remains a placeholder until the Render deployment is validated. On Render Free, the
first request to `/docs` after an idle period may experience a cold start.

## Workers

### Outbox Publisher Worker

Polls pending OutboxMessages, publishes them to RabbitMQ and records publication attempts and
results.

```bash
npm run start:worker:outbox
```

### Automation Worker

Consumes `lead-events.#` messages and invokes the same Automation Engine use case available through
manual API evaluation.

```bash
npm run start:worker:automation
```

The workers run as NestJS application contexts without exposing HTTP ports.

## Observability

- Pino emits JSON logs from the API and workers.
- Incoming `x-correlation-id` values are reused; otherwise the API generates one.
- `GET /health/live` reports process liveness.
- `GET /health/ready` verifies PostgreSQL and RabbitMQ connectivity.
- `GET /health` provides a summary health response.
- `GET /metrics` exposes Prometheus text metrics for outbox, dead letter and automation state.

Prometheus and Grafana are not deployed as part of the current public demo.

## CI/CD

GitHub Actions validates pull requests and pushes targeting `develop` or `main`:

```bash
npm run lint
npm run format:check
npm run test
npm run test:e2e
npm run build
```

Separate workflows validate the Docker image and publish versioned images to GHCR from `main`,
semantic version tags and manual runs.

## Deployment

The active portfolio deployment strategy is:

- Render Web Service for `eduflow-api`;
- Render PostgreSQL for persistence;
- CloudAMQP as the external RabbitMQ provider;
- optional Render Background Workers for the complete remote asynchronous flow;
- GHCR for versioned container images.

The deployment is intentionally cost-controlled. Render Free can introduce cold starts and other
provider limits, while Background Workers can incur charges. When workers are not enabled remotely,
Docker Compose remains the canonical way to demonstrate the complete event-driven pipeline.

Azure was replaced as the active strategy because EduFlow is exclusively a portfolio project.
Render and CloudAMQP reduce cost and infrastructure complexity while preserving the architectural
behaviors the project is intended to demonstrate.

See:

- [Deployment Strategy](docs/deployment.md)
- [Render Deployment](docs/render-deployment.md)
- [CloudAMQP](docs/cloudamqp.md)
- [Portfolio Deployment](docs/portfolio-deployment.md)
- [Google Meet Interview Webhook](docs/google-meet-interview-webhook.md)

## Technical Decisions

- [ADR 0001: Use TypeScript and NestJS](docs/decisions/0001-use-typescript-nestjs.md)
- [ADR 0002: Use Event-Driven Architecture](docs/decisions/0002-use-event-driven-architecture.md)
- [ADR 0003: Use Outbox Pattern](docs/decisions/0003-use-outbox-pattern.md)

## Portfolio Notes

- This repository is a backend engineering portfolio case study, not a commercial SaaS product.
- The public demo must use synthetic data only.
- Authentication and tenant access control are outside the current scope.
- Provider limits, cold starts and optional worker suspension are documented instead of hidden.
- A public URL is not claimed until it has been validated.
- The complete local workflow is reproducible with Docker Compose.
- The project favors explicit trade-offs and testable reliability patterns over artificial
  complexity.

## Roadmap

- Record and publish validated public demo evidence
- Add automatic Dead Letter reprocessing with controlled backoff
- Add distributed idempotency where worker-side deduplication requires it
- Expand automation execution and task inspection APIs
- Add OpenAPI documentation
- Add deployed Prometheus/Grafana dashboards
- Add end-to-end tracing across API, outbox, broker and workers
- Review production-grade security and data lifecycle requirements as a separate exercise

## Documentation

- [Architecture](docs/architecture.md)
- [API Examples](docs/api-examples.md)
- [Local Development](docs/local-development.md)
- [GitFlow Strategy](docs/gitflow.md)
- [Deployment Strategy](docs/deployment.md)
- [Render Deployment](docs/render-deployment.md)
- [CloudAMQP](docs/cloudamqp.md)
- [Portfolio Deployment](docs/portfolio-deployment.md)
- [Google Meet Interview Webhook](docs/google-meet-interview-webhook.md)

## License

This project is licensed under the [MIT License](LICENSE).
