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
OUTBOX_PUBLISHER_ENABLED=true
OUTBOX_PUBLISHER_INTERVAL_MS=5000
OUTBOX_PUBLISH_LIMIT=100
AUTOMATION_WORKER_ENABLED=true
AUTOMATION_WORKER_QUEUE=eduflow.automation.events
AUTOMATION_WORKER_BINDING_KEY=lead-events.#
AUTOMATION_WORKER_PREFETCH=10
WEBHOOK_TIMEOUT_MS=5000
WEBHOOK_MAX_ATTEMPTS=3
WEBHOOK_RETRY_DELAY_MS=1000
```

`LOG_LEVEL` controls the minimum JSON log level used by the API and workers. Supported Pino levels
include `trace`, `debug`, `info`, `warn`, `error` and `fatal`.

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

## Run the Outbox Publisher Worker

With PostgreSQL and RabbitMQ running, start the automatic outbox publisher worker:

```bash
npm run start:worker:outbox
```

The worker runs as a NestJS application context without opening an HTTP server. When
`OUTBOX_PUBLISHER_ENABLED=true`, it immediately publishes one batch and repeats every
`OUTBOX_PUBLISHER_INTERVAL_MS`. Each batch processes up to `OUTBOX_PUBLISH_LIMIT` pending messages.

Set `OUTBOX_PUBLISHER_ENABLED=false` to start the process without running the publishing loop. The
worker skips overlapping cycles, logs each cycle result and handles cycle errors without stopping.

To run the compiled worker after `npm run build`:

```bash
npm run start:worker:outbox:prod
```

## Run the Automation Worker

With PostgreSQL and RabbitMQ running, start the automation worker:

```bash
npm run start:worker:automation
```

The worker runs as a NestJS application context without opening an HTTP server. When
`AUTOMATION_WORKER_ENABLED=true`, it declares the durable `eduflow.events` topic exchange, declares
the durable queue configured by `AUTOMATION_WORKER_QUEUE`, binds it using
`AUTOMATION_WORKER_BINDING_KEY` and consumes messages using `AUTOMATION_WORKER_PREFETCH`.

The default queue is `eduflow.automation.events` and the default binding key is `lead-events.#`.
Valid `LeadEvent` messages execute the Automation Engine using the message `aggregateId` as the lead
event ID. Messages for another aggregate type are acknowledged and ignored.

Invalid payloads and missing lead events are negatively acknowledged without requeue. Unexpected
errors are negatively acknowledged with requeue.

`SEND_WEBHOOK` automation actions are delivered by the Automation Engine using native `fetch`.
The action config requires `url`, defaults to `POST` and may include `method` and string-valued
`headers`. Requests time out after `WEBHOOK_TIMEOUT_MS` and are attempted up to
`WEBHOOK_MAX_ATTEMPTS`, waiting `WEBHOOK_RETRY_DELAY_MS` between attempts. HTTP 2xx responses are
successful. Final failures create a pending `webhook.delivery_failed` record available through the
Dead Letter endpoints.

Inspect and ignore Dead Letter messages:

```bash
curl http://localhost:3000/dead-letter/messages
curl http://localhost:3000/dead-letter/messages/<id>
curl -X PATCH http://localhost:3000/dead-letter/messages/<id>/ignore
```

This phase does not automatically reprocess Dead Letter messages or schedule distributed retries.

To validate the complete local flow, run the API, outbox publisher worker and automation worker in
separate terminals. Register a lead event and confirm that its outbox message is published and then
consumed by the automation worker.

To run the compiled worker after `npm run build`:

```bash
npm run start:worker:automation:prod
```

## Observability

API and worker logs are emitted as JSON through Pino. HTTP requests read `x-correlation-id` when it
is provided, otherwise generate a UUID. The same value is returned in the response
`x-correlation-id` header and included in request-scoped logs as `correlationId`.

Check process liveness:

```bash
curl http://localhost:3000/health/live
```

Check application readiness, including PostgreSQL and RabbitMQ:

```bash
curl http://localhost:3000/health/ready
```

The original summary endpoint remains available:

```bash
curl http://localhost:3000/health
```

Inspect current metrics in Prometheus text format:

```bash
curl http://localhost:3000/metrics
```

The initial metrics expose current counts for outbox statuses, Dead Letter statuses, automation
execution results and active automation flows. Prometheus, Grafana, OpenTelemetry and external
observability backends are not deployed in this phase.

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
