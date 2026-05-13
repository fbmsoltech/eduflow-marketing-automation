# 0001 - Use TypeScript and NestJS

## Status

Accepted

## Context

EduFlow Marketing Automation is a backend portfolio project designed to demonstrate modern backend engineering practices, including:

- REST APIs;
- modular architecture;
- automated tests;
- asynchronous processing;
- event-driven design;
- observability;
- cloud-native deployment.

The project needs a technology stack that supports strong typing, maintainability, testability and clear modular boundaries.

## Decision

The project will use TypeScript with Node.js and NestJS as the main backend framework.

## Consequences

### Positive

- Strong typing with TypeScript.
- Good support for modular architecture.
- Good integration with REST APIs.
- Good support for dependency injection.
- Good testing experience.
- Suitable for Clean Architecture organization.
- Familiar ecosystem for queues, validation, logging and observability.

### Negative

- More initial structure compared to a minimal Express application.
- Requires discipline to avoid framework-specific logic leaking into domain layers.
- Some abstractions can be verbose for small features.

## Alternatives Considered

### Express with TypeScript

Rejected because it requires more manual architectural decisions and conventions.