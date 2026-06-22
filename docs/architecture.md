# Architecture

## Overview

EduFlow Marketing Automation is an event-driven backend for academic campaigns, courses,
community events and selection processes.

Organizations can register campaigns and leads, capture behavioral events and define automation
flows that update lead state, create tasks or dispatch webhooks. PostgreSQL is the source of truth,
and background workers separate event publication and automation execution from the HTTP request
path.

## Business Context

Academic acquisition and selection processes often involve manual follow-up across forms, email,
messaging groups and interviews. EduFlow models these interactions as LeadEvents so engagement can
be processed consistently and audited.

Core concepts include:

- Organization
- Campaign
- Lead
- LeadEvent
- AutomationFlow
- AutomationCondition
- AutomationAction
- AutomationExecution
- Task
- OutboxMessage
- DeadLetterMessage

## Architectural Style

The project combines:

- Clean Architecture boundaries;
- use-case-driven application design;
- repository contracts;
- event-driven processing;
- Transactional Outbox Pattern;
- independently runnable API and workers.

## Application Layers

```txt
Domain
  Entities, domain types and business invariants

Application
  Use cases, repository contracts and orchestration services

Infrastructure
  Prisma repositories, RabbitMQ adapters, HTTP clients and observability

Presentation
  NestJS controllers, request DTOs and response DTOs
```

### Domain

The Domain layer contains framework-independent entities and rules. It does not depend on NestJS,
Prisma, HTTP, RabbitMQ or Redis.

Examples:

- `Organization`
- `Campaign`
- `Lead`
- `LeadEvent`
- `AutomationFlow`
- `AutomationCondition`
- `AutomationAction`
- `AutomationExecution`
- `OutboxMessage`
- `DeadLetterMessage`

### Application

The Application layer coordinates business operations through focused use cases and services.
Repository and broker dependencies are expressed as contracts.

Examples:

- create and query organizations, campaigns and leads;
- update lead score and status;
- register idempotent LeadEvents;
- create, activate and evaluate automation flows;
- publish pending OutboxMessages;
- inspect and ignore DeadLetterMessages.

### Infrastructure

The Infrastructure layer implements external adapters:

- Prisma repository implementations;
- PostgreSQL connection lifecycle;
- RabbitMQ publisher;
- native `fetch` webhook client;
- Pino logging;
- Prometheus metric collection;
- database and broker health indicators.

### Presentation

The Presentation layer exposes REST controllers and validates requests at the HTTP boundary. The
controllers delegate to application use cases and do not contain business rules.

## Runtime Components

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

### NestJS API

The API exposes resources for:

- organizations;
- campaigns;
- leads;
- lead events;
- automations;
- outbox inspection and diagnostic publication;
- dead letter inspection;
- health and metrics.

### PostgreSQL and Prisma

PostgreSQL stores domain state, automation definitions, executions, OutboxMessages and
DeadLetterMessages. Prisma implements persistence and committed migrations.

### Outbox Publisher Worker

The Outbox Publisher Worker:

1. polls pending OutboxMessages;
2. publishes a limited batch to RabbitMQ;
3. records attempts;
4. marks successful messages as `PUBLISHED`;
5. marks failed publications as `FAILED`;
6. logs each cycle without overlapping scheduled runs.

### RabbitMQ

The publisher uses:

```txt
Exchange: eduflow.events
Type: topic
Routing key: lead-events.<eventType>
```

The Automation Worker uses:

```txt
Queue: eduflow.automation.events
Binding key: lead-events.#
```

RabbitMQ runs in Docker Compose locally. CloudAMQP provides external RabbitMQ for the Render demo.

### Automation Worker

The Automation Worker runs as a NestJS application context without an HTTP server. It consumes
LeadEvent messages and invokes the Automation Engine using the referenced LeadEvent ID.

Invalid messages and missing LeadEvents are rejected without requeue. Unexpected processing errors
are rejected with requeue so transient failures can be retried by RabbitMQ.

### Automation Engine

The Automation Engine:

1. loads the LeadEvent and its related lead, campaign and organization context;
2. selects active flows by organization, campaign scope and trigger event type;
3. evaluates conditions with AND semantics;
4. creates an AutomationExecution for each matched flow;
5. dispatches actions in configured order;
6. records the final execution status.

Current action types:

- `INCREASE_LEAD_SCORE`
- `DECREASE_LEAD_SCORE`
- `UPDATE_LEAD_STATUS`
- `CREATE_TASK`
- `SEND_WEBHOOK`
- `SEND_NOTIFICATION`, which currently fails explicitly because no notification provider is
  implemented

## Event-Driven Flow

Example: a candidate submits a campaign form.

```txt
1. POST /lead-events receives form.submitted.
2. The API validates organization, campaign and lead relationships.
3. LeadEvent and OutboxMessage are committed in one transaction.
4. The Outbox Publisher Worker publishes the message.
5. RabbitMQ routes it to eduflow.automation.events.
6. The Automation Worker consumes the message.
7. Active form.submitted flows are evaluated.
8. Matching actions update lead state, create tasks or call webhooks.
9. AutomationExecution stores success or failure.
10. Logs and metrics expose the result.
```

## Transactional Outbox Pattern

The API does not rely on publishing to RabbitMQ inside the same request path that persists the
LeadEvent.

```txt
BEGIN TRANSACTION

INSERT INTO lead_events
INSERT INTO outbox_messages

COMMIT
```

The worker publishes only after the database transaction succeeds. This prevents a committed
LeadEvent from being silently lost when RabbitMQ is unavailable during ingestion.

Outbox inspection endpoints:

```txt
GET  /outbox/messages
GET  /outbox/messages/:id
POST /outbox/messages/publish
```

The POST endpoint is a diagnostic/manual publishing option. The worker is the normal publication
path.

## Idempotency

LeadEvent ingestion requires an `idempotencyKey`. PostgreSQL enforces uniqueness for the pair:

```txt
organizationId + idempotencyKey
```

When the same request is retried, the application returns the existing LeadEvent and does not
create another OutboxMessage.

This protects the ingestion boundary. Broader distributed action-level deduplication remains a
future reliability improvement.

## Retry and Dead Letter Handling

### Broker processing

- publication failures are recorded on the OutboxMessage;
- unexpected Automation Worker failures are rejected with requeue;
- invalid or non-processable messages are rejected without requeue.

Automatic exponential backoff and a dedicated broker dead-letter topology are not implemented in
the current scope.

### Webhook delivery

`SEND_WEBHOOK` uses native `fetch` with:

- configurable timeout;
- configurable maximum attempts;
- configurable fixed delay between attempts;
- success on HTTP 2xx responses;
- failure on timeout, network errors or non-2xx responses.

After the final failed attempt:

- the AutomationExecution is marked `FAILED`;
- a `webhook.delivery_failed` DeadLetterMessage is persisted;
- the message can be listed, inspected and marked `IGNORED`.

Automatic Dead Letter reprocessing is not implemented.

## Observability

### Structured logs

The API and workers emit JSON logs through Pino. HTTP requests reuse an incoming
`x-correlation-id` or generate a UUID and return it in the response.

Relevant fields include:

- correlation ID;
- event and aggregate identifiers;
- automation flow and execution identifiers;
- routing information;
- processing counts and duration;
- errors.

### Health checks

```txt
GET /health/live
GET /health/ready
GET /health
```

- `/health/live` reports process liveness.
- `/health/ready` verifies PostgreSQL and RabbitMQ.
- `/health` returns the summary health response.

### Metrics

`GET /metrics` exposes Prometheus text metrics for:

```txt
eduflow_outbox_pending_total
eduflow_outbox_published_total
eduflow_outbox_failed_total
eduflow_dead_letters_pending_total
eduflow_dead_letters_ignored_total
eduflow_automation_executions_succeeded_total
eduflow_automation_executions_failed_total
eduflow_automation_flows_active_total
```

Prometheus, Grafana and full distributed tracing are not deployed in the current portfolio demo.

## Deployment Architecture

The active public-demo target uses:

- Render Web Service for the API;
- Render PostgreSQL;
- CloudAMQP for external RabbitMQ;
- optional Render Background Workers;
- GHCR for versioned images.

The public environment is intentionally limited. Render Free may introduce cold starts, and
Background Workers can require paid capacity.

Docker Compose remains the complete local reference and runs PostgreSQL, Redis, RabbitMQ,
migrations, the API and both workers.

Azure was replaced as the active deployment strategy because this project is exclusively for
portfolio use. Render and CloudAMQP reduce cost and operational complexity without changing the
core event-driven design.

## Design Goals

- Keep domain rules independent from frameworks.
- Keep controllers thin and use cases focused.
- Make persistence and broker publication auditable.
- Avoid losing events between PostgreSQL and RabbitMQ.
- Scale API and workers independently.
- Preserve correlation across asynchronous processing.
- Document incomplete reliability features honestly.
- Keep the repository reproducible and understandable for technical review.

## Related Documentation

- [API Examples](api-examples.md)
- [Local Development](local-development.md)
- [Deployment Strategy](deployment.md)
- [Render Deployment](render-deployment.md)
- [CloudAMQP](cloudamqp.md)
- [ADR 0002: Event-Driven Architecture](decisions/0002-use-event-driven-architecture.md)
- [ADR 0003: Outbox Pattern](decisions/0003-use-outbox-pattern.md)
