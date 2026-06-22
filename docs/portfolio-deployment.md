# Deployment

## Decision

EduFlow replaced the active Azure Container Apps plan with Render and CloudAMQP.

The project exists exclusively as a backend engineering portfolio project. Azure Container Apps,
managed PostgreSQL, managed Redis, operational logging resources and deployment scripts created a
cost and maintenance surface that was larger than the value of keeping a small public demo online.

Render provides a simpler public web-service workflow, while CloudAMQP preserves the RabbitMQ-based
event-driven architecture without operating a broker in the application host. This keeps the demo
closer to the implemented design and easier for reviewers to access.

Azure remains a possible future infrastructure exercise, but it is not an active deployment target
and no Azure provisioning scripts are maintained in this repository.

## Public Demo Scope

The intended public architecture is:

- `eduflow-api` as a Render Web Service;
- `eduflow-postgres` or another PostgreSQL-compatible provider;
- CloudAMQP as external RabbitMQ;
- optional Render Background Workers for outbox publication and automation consumption;
- GHCR as the registry for versioned application images.

The repository Blueprint builds the Dockerfile from source. The GHCR publication workflow remains
available as release evidence and as an alternative manual Render image source.

## Free and Limited Operation

The public deployment is a free or low-cost, limited demonstration. It is not a production
environment.

Expected limitations include:

- free web services can spin down and have cold starts;
- free Render PostgreSQL databases have limited storage and can expire;
- free usage has monthly compute, bandwidth and build limits;
- background workers do not have a free Render plan and can require payment;
- CloudAMQP free or low-cost plans have connection, queue, throughput and storage limits;
- service availability and retained demo data are not guaranteed;
- no high availability, disaster recovery, private networking or production SLO is promised.

To keep the public demo free, it is acceptable to expose only the API with temporary PostgreSQL and
CloudAMQP connectivity, while leaving dedicated workers suspended or uncreated. In that mode,
worker-driven automation is demonstrated locally.

## Complete Local Demonstration

Docker Compose remains the authoritative way to run the complete stack:

```bash
npm run docker:build
npm run docker:up
```

The local environment runs:

- PostgreSQL;
- Redis;
- RabbitMQ and its management interface;
- Prisma migrations;
- the API;
- the Outbox Publisher Worker;
- the Automation Worker.

This local flow demonstrates the full transactional outbox and asynchronous automation path without
depending on external quotas, sleeping services or paid worker instances.

## Production Disclaimer

EduFlow is not operated as a production service. The public environment must not receive real
student, candidate, customer or organization data.

The deployment does not claim production-grade:

- availability;
- scaling;
- backup and restore;
- security hardening;
- secret rotation automation;
- incident response;
- data retention;
- regulatory compliance;
- monitoring coverage.

Only synthetic demonstration data should be used.
