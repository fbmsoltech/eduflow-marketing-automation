# Azure Deployment Runbook

## Purpose

This runbook covers the first manual deployment of EduFlow to Azure Container Apps. Commands may
create billable Azure resources.

## Prerequisites

- Bash;
- `jq`;
- Azure CLI with an authenticated subscription;
- Container Apps CLI support;
- permission to create resource groups and the target services;
- public GHCR access, or a GitHub token with `read:packages`;
- an external RabbitMQ broker reachable from Azure;
- a migration-capable image.

Validate the session:

```bash
az version
az account show
az extension add --name containerapp --upgrade
```

## 1. Configure the Deployment

```bash
cp infra/azure/env.example infra/azure/env.local
```

Edit `env.local`. Use globally unique PostgreSQL and Redis names. Do not use `localhost` in any
cloud connection URL.

## 2. Provision Azure Resources

```bash
bash infra/azure/create-resources.sh
```

The script is idempotent at resource level: existing named resources are reused and missing
resources are created.

It creates:

- Resource Group;
- Log Analytics Workspace;
- Container Apps Environment;
- PostgreSQL Flexible Server and database;
- Azure Cache for Redis.

The PostgreSQL public-access setting is an initial deployment trade-off. Review the resulting
firewall rules before using production data.

## 3. Complete Runtime Secrets

Build the connection values described in [Azure Secrets](azure-secrets.md):

```txt
DATABASE_URL=...
REDIS_URL=...
RABBITMQ_URL=...
```

Confirm the hosts are cloud-reachable and use TLS where the service supports it.

## 4. Prepare the Migration Image

The currently published application image cannot run Prisma migrations: its runtime stage does not
contain the Prisma CLI or the `prisma/` directory.

Before the first database deployment, publish a dedicated migration image that contains:

- production dependencies needed by Prisma;
- Prisma CLI;
- generated Prisma Client;
- `prisma/schema.prisma`;
- committed migration files.

Set its immutable reference:

```txt
MIGRATIONS_IMAGE=ghcr.io/<owner>/<repository>:<migration-capable-tag>
```

`deploy-container-apps.sh` creates the manual Job only when `MIGRATIONS_IMAGE` is set to a value
different from the application image. `run-migrations.sh` refuses to start an unprepared Job.

## 5. Deploy API, Workers and Migration Job

```bash
bash infra/azure/deploy-container-apps.sh
```

The script:

- stores runtime URLs as Container Apps secrets;
- deploys the API with external ingress on port `3000`;
- configures liveness and readiness probes;
- deploys both workers without ingress;
- fixes both workers at one replica for the first deployment;
- creates or updates the manual migration Job when its image is ready.

## 6. Run Migrations

Run migrations before accepting application traffic:

```bash
bash infra/azure/run-migrations.sh
```

The script starts the manual Job and prints its execution name. Inspect the result:

```bash
az containerapp job execution list \
  --name "$MIGRATIONS_JOB_NAME" \
  --resource-group "$AZURE_RESOURCE_GROUP" \
  --output table
```

Do not run `prisma migrate dev` in Azure. Cloud deployment uses only committed migrations through
`prisma migrate deploy`.

## 7. Validate the API

```bash
API_FQDN="$(az containerapp show \
  --name "$API_APP_NAME" \
  --resource-group "$AZURE_RESOURCE_GROUP" \
  --query properties.configuration.ingress.fqdn \
  --output tsv)"

curl --fail-with-body "https://${API_FQDN}/health/live"
curl --fail-with-body "https://${API_FQDN}/health/ready"
```

Expected results:

- `/health/live` returns success when the Node.js process responds;
- `/health/ready` returns success only when PostgreSQL and RabbitMQ are available.

## 8. Inspect Revisions and Logs

```bash
az containerapp revision list \
  --name "$API_APP_NAME" \
  --resource-group "$AZURE_RESOURCE_GROUP" \
  --output table

az containerapp logs show \
  --name "$API_APP_NAME" \
  --resource-group "$AZURE_RESOURCE_GROUP" \
  --follow
```

Repeat the log command with the worker app names. Structured JSON logs and Container Apps system
logs flow to the configured Log Analytics Workspace.

## Deployment Order

The safe release sequence is:

1. provision or verify managed dependencies;
2. deploy/update the migration Job definition;
3. run and verify migrations;
4. deploy or update workers;
5. deploy or update the API;
6. verify readiness;
7. run smoke tests.

The initial script creates all workload definitions together for convenience. For production
releases, preserve the ordering above and use immutable image tags.

## Rollback

Application rollback:

1. select the last known-good immutable image tag;
2. update API and worker apps to that image;
3. verify revision health and logs;
4. avoid rolling back a database migration unless the migration was explicitly designed and tested
   for reversal.

Example:

```bash
az containerapp update \
  --name "$API_APP_NAME" \
  --resource-group "$AZURE_RESOURCE_GROUP" \
  --image "<known-good-image>"
```

Database recovery should use forward-fix migrations or managed PostgreSQL restore procedures.

## RabbitMQ Incident Notes

RabbitMQ is outside this Azure resource group during Phase 20.

- The API readiness endpoint fails when RabbitMQ is unavailable.
- The Outbox Publisher Worker retains pending or failed publication state.
- The Automation Worker cannot consume events until connectivity returns.
- Check broker firewall rules, TLS certificates, credentials, vhost permissions and Azure egress.

Azure Service Bus migration is explicitly deferred.

## Cleanup

Resource-group deletion removes all resources created inside it and is destructive:

```bash
az group delete --name "$AZURE_RESOURCE_GROUP"
```

Run cleanup only after confirming the subscription, resource group and data-retention requirements.
