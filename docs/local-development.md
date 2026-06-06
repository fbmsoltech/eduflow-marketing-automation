# Local Development

This document explains how to run EduFlow local infrastructure for development.

## Requirements

- Node.js 20 or later
- Docker
- Docker Compose

## Services

The local environment uses Docker Compose with:

- PostgreSQL on `localhost:5432`
- Redis on `localhost:6379`
- RabbitMQ AMQP on `localhost:5672`
- RabbitMQ Management UI on `localhost:15672`

## Environment Variables

Copy `.env.example` to `.env` when local application configuration is needed.

```txt
DATABASE_URL=postgresql://eduflow:eduflow@localhost:5432/eduflow
REDIS_URL=redis://localhost:6379
RABBITMQ_URL=amqp://eduflow:eduflow@localhost:5672
RABBITMQ_EXCHANGE=eduflow.events
RABBITMQ_EXCHANGE_TYPE=topic
OUTBOX_PUBLISH_LIMIT=100
```

Prisma commands read `DATABASE_URL` from the local environment. For the default local setup, copy `.env.example` to `.env` before running migrations.

RabbitMQ Management UI credentials:

```txt
Username: eduflow
Password: eduflow
```

## Start Services

```bash
npm run infra:up
```

## Check Services

```bash
npm run infra:ps
```

To inspect logs:

```bash
npm run infra:logs
```

Open RabbitMQ Management UI:

```txt
http://localhost:15672
```

## Publish Pending Outbox Messages

With PostgreSQL, RabbitMQ and the API running, manually publish pending outbox messages:

```bash
curl -X POST http://localhost:3000/outbox/messages/publish \
  -H "Content-Type: application/json" \
  -d "{\"limit\":10}"
```

The optional `limit` overrides `OUTBOX_PUBLISH_LIMIT` for that request. Messages are published
to the durable topic exchange configured by `RABBITMQ_EXCHANGE`, using routing keys in the
`lead-events.<eventType>` format.

The endpoint returns:

```json
{
  "processed": 1,
  "published": 1,
  "failed": 0
}
```

After a successful publication, inspect `GET /outbox/messages` to confirm that the message is
`PUBLISHED`, `publishedAt` is filled and `attempts` was incremented.

## Database Migrations

Generate Prisma Client:

```bash
npm run prisma:generate
```

Create and apply local development migrations:

```bash
npm run prisma:migrate:dev
```

Open Prisma Studio:

```bash
npm run prisma:studio
```

If Prisma reports authentication errors while Docker Compose is running, check whether another local PostgreSQL service is already listening on port `5432`. In that case, stop the conflicting local service or point `DATABASE_URL` to the PostgreSQL instance you intend to migrate.

## Stop Services

```bash
npm run infra:down
```

The Compose file uses named volumes:

- `eduflow_postgres_data`
- `eduflow_redis_data`
- `eduflow_rabbitmq_data`

These volumes keep local data between restarts. Remove them manually only when a clean local environment is required.
