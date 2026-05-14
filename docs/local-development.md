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
```

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

## Stop Services

```bash
npm run infra:down
```

The Compose file uses named volumes:

- `eduflow_postgres_data`
- `eduflow_redis_data`
- `eduflow_rabbitmq_data`

These volumes keep local data between restarts. Remove them manually only when a clean local environment is required.
