# Azure Container Apps Deployment

## Target Architecture

```txt
Internet
   |
   v
Azure Container App: eduflow-api
external ingress, target port 3000
   |
   +--> PostgreSQL Flexible Server
   +--> Azure Cache for Redis
   +--> External RabbitMQ broker

Azure Container App: eduflow-outbox-worker
no ingress, minReplicas=1, maxReplicas=1
   |
   +--> PostgreSQL Flexible Server
   +--> External RabbitMQ broker

Azure Container App: eduflow-automation-worker
no ingress, minReplicas=1, maxReplicas=1
   |
   +--> PostgreSQL Flexible Server
   +--> External RabbitMQ broker

Azure Container Apps Job: eduflow-migrations
manual trigger, one execution at a time
   |
   +--> PostgreSQL Flexible Server

Azure Container Apps Environment
   |
   +--> Log Analytics Workspace
```

All runtime components use the same Container Apps Environment so logs have one operational query
surface. PostgreSQL and Redis are managed services. RabbitMQ remains an external cloud-accessible
dependency during this phase.

## Azure Resources

The initial resource set is:

- one Resource Group;
- one Log Analytics Workspace;
- one Azure Container Apps Environment;
- one Azure Database for PostgreSQL Flexible Server and database;
- one Azure Cache for Redis instance;
- three Azure Container Apps;
- one manual Azure Container Apps Job for migrations.

The scripts use the Azure Consumption workload profile and conservative initial resource sizes.
Production sizing, private networking, availability zones and autoscaling rules require a later
capacity and security review.

## Container Apps

### API

The API:

- uses external ingress;
- exposes target port `3000`;
- starts with `npm run start`;
- uses `/health/live` as the liveness probe;
- uses `/health/ready` as the readiness probe;
- starts with one minimum replica and may use the configured API maximum.

Readiness checks PostgreSQL and RabbitMQ. Redis is configured but is not currently part of the
application readiness endpoint.

### Outbox Publisher Worker

The Outbox Publisher Worker:

- has no ingress;
- starts with `npm run start:worker:outbox:prod`;
- uses `minReplicas=1` and `maxReplicas=1` for the first deployment;
- publishes pending outbox messages to RabbitMQ.

### Automation Worker

The Automation Worker:

- has no ingress;
- starts with `npm run start:worker:automation:prod`;
- uses `minReplicas=1` and `maxReplicas=1` for the first deployment;
- consumes automation events from RabbitMQ.

Workers do not expose HTTP health endpoints. Their first-deployment health signal is replica state,
process restarts and structured logs in Log Analytics.

## Image Registry

A public GHCR package can be pulled anonymously by Azure Container Apps, which keeps the initial
deployment simple.

If the GHCR package is private, set `GHCR_USERNAME` and `GHCR_TOKEN` in `infra/azure/env.local`.
The token needs only `read:packages`. The deployment script stores the token as a Container Apps
registry secret; it must never be committed.

For repeatable environments, prefer an immutable semantic-version or `sha-` image tag over
`latest`. The supplied image variable remains configurable for that reason.

## Network Requirements

Cloud variables must never use `localhost`.

- `DATABASE_URL` must use the PostgreSQL Flexible Server hostname.
- `REDIS_URL` must use the managed Redis TLS hostname and port.
- `RABBITMQ_URL` must use a broker reachable from Azure Container Apps.

The first provisioning script supports public PostgreSQL access configuration for initial
validation. Treat broad Azure-service access as temporary. Production should use a VNet-integrated
Container Apps Environment, private endpoints, private DNS and restricted egress.

## Health and Smoke Checks

After deployment:

```bash
API_FQDN="$(az containerapp show \
  --name "$API_APP_NAME" \
  --resource-group "$AZURE_RESOURCE_GROUP" \
  --query properties.configuration.ingress.fqdn \
  --output tsv)"

curl --fail-with-body "https://${API_FQDN}/health/live"
curl --fail-with-body "https://${API_FQDN}/health/ready"
```

The liveness endpoint verifies the process. The readiness endpoint verifies PostgreSQL and
RabbitMQ connectivity and should be used before directing operational traffic to a revision.

## Manual Deployment Flow

1. Copy `infra/azure/env.example` to `infra/azure/env.local`.
2. Fill resource names and provisioning credentials.
3. Run `infra/azure/create-resources.sh`.
4. build `DATABASE_URL` and `REDIS_URL` from the provisioned managed services.
5. configure a cloud-reachable `RABBITMQ_URL`.
6. set a migration-capable `MIGRATIONS_IMAGE`.
7. run `infra/azure/deploy-container-apps.sh`.
8. run `infra/azure/run-migrations.sh`.
9. validate API health and inspect worker logs.

The detailed operational sequence and rollback guidance are in
[Azure Runbook](azure-runbook.md).

## Current Limitations

- Deployment is manual.
- RabbitMQ is not managed by these scripts.
- The current application image is not migration-capable because its runtime stage does not contain
  the Prisma CLI or Prisma schema.
- Microsoft has announced its retirement path, so Azure Managed Redis should be evaluated in a future ADR.
- Private networking and Key Vault references are follow-up hardening tasks.
