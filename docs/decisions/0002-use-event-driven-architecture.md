# 0002 - Use Event-Driven Architecture

## Status

Accepted

## Context

The main goal of EduFlow is to automate marketing workflows based on lead behavior.

Examples:

- a lead is created;
- a candidate starts a form;
- a candidate submits a form;
- a candidate clicks an email link;
- a candidate joins a WhatsApp group;
- an interview is scheduled.

These interactions should trigger automation flows asynchronously, without blocking the main API request.

## Decision

The project will use an event-driven architecture.

Business events will be persisted, published to a message broker and processed by workers.

## Consequences

### Positive

- Better separation between event ingestion and processing.
- Improved scalability for background tasks.
- Easier retry and dead-letter handling.
- Better fit for automation workflows.
- Better observability of business events.
- Allows independent scaling of API and workers.

### Negative

- Adds operational complexity.
- Requires message broker configuration.
- Requires idempotency controls.
- Requires careful error handling and monitoring.

## Main Event Types

- `lead.created`
- `form.started`
- `form.submitted`
- `email.opened`
- `email.clicked`
- `whatsapp.link_clicked`
- `document.downloaded`
- `interview.scheduled`
- `interview.confirmed`
- `candidate.approved`
- `candidate.rejected`

## Alternatives Considered

### Synchronous Processing

- Rejected because automation execution could slow down API requests and reduce resilience.

### Scheduled Batch Processing

- Rejected because the project needs near real-time automation behavior.
