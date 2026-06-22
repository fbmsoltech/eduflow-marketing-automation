# Architecture

## Overview

EduFlow Marketing Automation is an event-driven marketing automation platform designed for academic campaigns, courses, community events and selection processes.

The system allows organizations to capture leads, track behavioral events, evaluate automation rules, update lead scores, create operational tasks and dispatch integrations asynchronously.

## Business Context

Academic organizations, courses and communities often run campaigns to attract candidates, students or participants.

Most of the follow-up process is manual:

- confirming registrations;
- reminding candidates to complete forms;
- identifying engaged leads;
- creating follow-up tasks;
- sending messages or integrations;
- tracking conversion metrics.

EduFlow simulates this scenario by providing an automation engine where every lead interaction can trigger rules and actions.

## Main Capabilities

- Organization management
- Campaign management
- Lead capture
- Behavioral event tracking
- Automation flow configuration
- Rule evaluation
- Lead scoring
- Task creation
- Webhook dispatch
- Asynchronous processing
- Retry and dead-letter handling
- Observability with logs, metrics and traces

## High-Level Architecture

```txt
                +----------------------+
                |       REST API        |
                |   NestJS + TypeScript |
                +----------+-----------+
                           |
                           v
                +----------------------+
                |      PostgreSQL       |
                |  Transactional data   |
                +----------+-----------+
                           |
                           v
                +----------------------+
                |        Outbox         |
                | Pending domain events |
                +----------+-----------+
                           |
                           v
                +----------------------+
                |    Message Broker     |
                | RabbitMQ / ServiceBus |
                +----------+-----------+
                           |
        +------------------+------------------+
        |                  |                  |
        v                  v                  v
+---------------+  +---------------+  +----------------+
| Event Worker  |  |  Automation   |  | Webhook Worker |
|               |  | Engine Worker |  |                |
+---------------+  +---------------+  +----------------+
        |                  |                  |
        +------------------+------------------+
                           |
                           v
                +----------------------+
                |        Redis          |
                |  Cache / Idempotency  |
                +----------------------+
```

## Application Layers

The project follows Clean Architecture principles.

```txt
Domain
Application
Infrastructure
Presentation
```

### Domain Layer

Contains enterprise rules and domain models.

Examples:

- Organization
- Campaign
- Lead
- LeadEvent
- AutomationFlow
- AutomationCondition
- AutomationAction
- AutomationExecution

### Application Layer

Contains use cases and application services.

Examples:

- CreateLeadUseCase
- CreateCampaignUseCase
- RegisterLeadEventUseCase
- EvaluateAutomationFlowUseCase
- DispatchAutomationActionUseCase

### Infrastructure Layer

Contains external dependencies.

Examples:

- Prisma repositories
- RabbitMQ publishers and consumers
- Redis idempotency store
- Webhook HTTP client
- Observability providers

### Presentation Layer

Contains controllers, request DTOs and API documentation.

Examples:

- LeadsController
- CampaignsController
- EventsController
- AutomationsController

## Event-Driven Flow

Example: a lead is created from an academic selection campaign.

```txt
1. API receives POST /leads.
2. Lead is persisted in PostgreSQL.
3. A lead.created event is stored in the outbox table.
4. Outbox publisher publishes the event to the message broker.
5. Automation worker consumes the event.
6. Active automation flows are evaluated.
7. Matching actions are dispatched.
8. Execution status is stored.
9. Metrics and logs are emitted.
```

## Automation Engine Current Scope

The initial automation engine supports automation flow registration and manual evaluation through
the REST API.

Current behavior:

- automation flows are created as `DRAFT` and can be activated explicitly;
- active flows are selected by organization, campaign scope and lead event type;
- conditions are evaluated with AND logic using event, lead, campaign and organization fields;
- internal actions can update lead score, update lead status and create tasks;
- each matched flow creates an execution that finishes as `SUCCEEDED` or `FAILED`;
- webhook actions use native HTTP delivery with timeout and basic in-process retry;
- final webhook failures create pending Dead Letter messages and fail the automation execution;
- unsupported notification actions fail with a clear execution error.

Evaluation can be triggered manually through `POST /automations/evaluate` or automatically by the
Automation Worker. The worker consumes LeadEvent outbox messages from RabbitMQ and invokes the same
Automation Engine use case. Redis usage, distributed or scheduled retries, automatic Dead Letter
reprocessing and real notification dispatch remain planned for later phases.

## Main Domain Events

```txt
lead.created
form.started
form.submitted
email.opened
email.clicked
whatsapp.link_clicked
document.downloaded
interview.scheduled
interview.confirmed
candidate.approved
candidate.rejected
```

## Reliability Patterns

The project will implement:

- Idempotency keys
- Outbox Pattern
- Retry with exponential backoff
- Dead-letter queue
- Correlation ID
- Structured logging
- Health checks
- Metrics endpoint

## Idempotency Strategy

Every external event should contain an idempotency key.

Example:

```json
{
  "eventId": "b8f3c8fa-5a64-4a4e-91d4-2f7cbb2a0e3f",
  "tenantId": "org_123",
  "leadId": "lead_456",
  "eventType": "lead.created",
  "idempotencyKey": "org_123:lead.created:b8f3c8fa-5a64-4a4e-91d4-2f7cbb2a0e3f",
  "occurredAt": "2026-05-12T10:00:00Z"
}
```

Before processing an event, the application checks whether the idempotency key has already been processed.

If the key already exists, the event is ignored safely.

## Outbox Pattern

When a business operation needs to persist data and publish an event, both actions are not executed independently.

Instead, the application persists the business data and the outbox message in the same database transaction.

Example:

```txt
BEGIN TRANSACTION

INSERT INTO leads
INSERT INTO lead_events
INSERT INTO outbox_messages

COMMIT
```

Then a background worker publishes pending outbox messages to the message broker.

Current implementation scope:

- `POST /lead-events` stores the `lead_events` row and a `PENDING` `outbox_messages` row in the same PostgreSQL transaction.
- Idempotent retries for the same `organizationId` and `idempotencyKey` return the existing lead event and do not create a duplicate outbox message.
- Read-only inspection endpoints are available at `GET /outbox/messages` and `GET /outbox/messages/:id`.
- `POST /outbox/messages/publish` manually publishes a limited batch of `PENDING` messages to the durable `eduflow.events` topic exchange.
- Lead event messages use routing keys in the `lead-events.<eventType>` format.
- Successful publications are marked as `PUBLISHED`; failed publications are marked as `FAILED`.
- The Outbox Publisher Worker automatically schedules message publication.
- The Automation Worker consumes `lead-events.#` messages from the durable
  `eduflow.automation.events` queue.
- Advanced retries and dead-letter handling remain planned for later phases.

## Retry and Dead Letter Strategy

The message processing flow should support retries for transient failures.

Example retry policy:

```txt
1st failure: retry after 5 seconds
2nd failure: retry after 30 seconds
3rd failure: retry after 2 minutes
4th failure: retry after 10 minutes
5th failure: send to dead-letter queue
```

Dead-lettered messages should be stored with enough information for analysis and reprocessing.

Current webhook delivery behavior:

- `SEND_WEBHOOK` uses native `fetch` and an `AbortController` timeout;
- HTTP 2xx responses are successful, while timeout, network errors and non-2xx responses fail;
- delivery is attempted up to `WEBHOOK_MAX_ATTEMPTS` with a fixed
  `WEBHOOK_RETRY_DELAY_MS` interval;
- after the final failure, the automation execution is marked `FAILED` and a
  `webhook.delivery_failed` record is stored in `dead_letter_messages`;
- messages can be inspected and marked `IGNORED` through `/dead-letter/messages`;
- automatic reprocessing and distributed retries are intentionally out of scope.

## Observability Strategy

The application should expose logs, metrics and traces.

### Logs

API and worker logs are emitted as JSON through Pino. HTTP requests reuse the incoming
`x-correlation-id` header or generate a UUID, return it in the response and include it in
request-scoped logs. Worker events include processing identifiers, routing information, result
counts, durations and errors where relevant.

Structured fields include:

- correlationId
- causationId
- tenantId
- eventId
- automationFlowId
- executionId

### Metrics

The API exposes current PostgreSQL-backed gauges at `GET /metrics`:

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

`GET /health/live` reports process liveness. `GET /health/ready` checks PostgreSQL and RabbitMQ.
Prometheus deployment, Grafana dashboards and complete OpenTelemetry tracing remain planned.

### Traces

Distributed traces should allow tracking a complete flow:

```txt
API request -> outbox message -> broker publish -> worker consume -> automation execution -> webhook delivery
```

## Main Technologies

- Node.js
- TypeScript
- NestJS
- PostgreSQL
- Prisma
- Redis
- RabbitMQ
- Docker
- Jest
- Supertest
- OpenTelemetry
- Prometheus
- Grafana
- GitHub Actions
- Azure Container Apps

## Planned Azure Resources

- Azure Container Registry
- Azure Container Apps
- Azure Database for PostgreSQL Flexible Server
- Azure Cache for Redis
- Azure Service Bus
- Azure Key Vault
- Azure Application Insights
- Azure Monitor
- Log Analytics Workspace

## Initial Container Apps

```txt
eduflow-api
eduflow-outbox-worker
eduflow-automation-worker
eduflow-webhook-worker
```

## Design Goals

- Keep the domain independent from frameworks.
- Keep business rules testable.
- Make asynchronous processing reliable.
- Avoid losing events between database persistence and broker publishing.
- Provide clear observability for event processing.
- Allow API and workers to scale independently.
- Keep the repository understandable for portfolio evaluation.

## Current Status

Architecture documentation initialized.

The actual implementation will be added incrementally through feature branches following the GitFlow strategy.
