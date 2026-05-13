# EduFlow Marketing Automation

EduFlow is an event-driven marketing automation platform designed for academic campaigns, selection processes, courses and community events.

The project simulates a real-world scenario where organizations need to capture leads, track behavioral events, evaluate automation rules, update lead scores, create tasks and dispatch integrations asynchronously.

## Current Status

NestJS application bootstrap phase.

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

Build and test:

```bash
npm run build
npm run lint
npm run test:e2e
```

## Status

This project is under active development.
