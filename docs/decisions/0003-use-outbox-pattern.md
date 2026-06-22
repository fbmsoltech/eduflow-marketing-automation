# 0003 - Use Outbox Pattern

## Status

Accepted

## Context

EduFlow needs to persist business data and publish domain events to a message broker.

A common failure scenario is:

1. Save lead data in the database.
2. Try to publish a `lead.created` event.
3. The message broker is unavailable.
4. The lead exists in the database, but the event was never published.

This creates inconsistency between the transactional database and the asynchronous processing pipeline.

For this project, losing domain events is not acceptable because automation flows depend on those events to execute actions such as lead scoring, task creation, reminders and webhook dispatch.

## Decision

The project will use the Outbox Pattern.

Whenever the API persists business data that should generate an event, it will also persist an outbox message in the same database transaction.

A background worker will read pending outbox messages and publish them to the message broker.

After a successful publication, the outbox message will be marked as published.

## Example Flow

During lead creation, the API will execute the following operations in the same transaction:

1. Insert the lead into the `leads` table.
2. Insert the lead event into the `lead_events` table.
3. Insert the pending message into the `outbox_messages` table.
4. Commit the transaction.

After that, the outbox worker will:

1. Read pending messages from `outbox_messages`.
2. Publish each message to the message broker.
3. Mark successfully published messages as published.
4. Retry failed publications.
5. Send messages to a dead-letter flow when necessary.

## Consequences

### Positive

- Improves reliability.
- Avoids losing domain events.
- Keeps database changes and event publication consistent.
- Allows retry when the message broker is temporarily unavailable.
- Makes event publication auditable.
- Reduces coupling between the API and the message broker.
- Supports eventual consistency between the database and workers.

### Negative

- Requires an additional database table.
- Requires a background publisher worker.
- Requires cleanup or retention strategy for published outbox messages.
- Event publication becomes eventually consistent.
- Adds operational complexity to monitor pending, failed and published messages.

## Outbox Message Statuses

The `outbox_messages` table should support the following statuses:

- `pending`
- `processing`
- `published`
- `failed`
- `dead_lettered`

## Initial Table Fields

The initial version of the `outbox_messages` table should include:

- `id`
- `aggregateId`
- `aggregateType`
- `eventType`
- `payload`
- `status`
- `attempts`
- `occurredAt`
- `publishedAt`
- `lastError`
- `createdAt`
- `updatedAt`

## Alternatives Considered

### Direct Broker Publishing

Rejected because an event could be lost if the broker becomes unavailable after the database transaction is committed.

### Distributed Transactions

Rejected because they add unnecessary complexity for this project and are not required for the expected architecture.

### Scheduled Batch Processing Without Outbox

Rejected because it would make event publication less explicit and harder to audit.

## Related Patterns

- Event-Driven Architecture
- Transactional Outbox
- Idempotency
- Retry with exponential backoff
- Dead-letter queue
- Correlation ID
