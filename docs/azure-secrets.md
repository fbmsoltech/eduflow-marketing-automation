# Azure Secrets and Environment Variables

## Principles

- Never commit `infra/azure/env.local`.
- Never place real credentials in scripts, documentation or command history.
- Use Azure Container Apps secrets for the first manual deployment.
- Move production secret ownership to Azure Key Vault in a later hardening phase.
- Rotate credentials immediately if they are printed, logged or committed.

The repository explicitly ignores `infra/azure/env.local`, so the deployment file remains local.

## Runtime Secrets

| Secret         | Used by                                | Description                        |
| -------------- | -------------------------------------- | ---------------------------------- |
| `DATABASE_URL` | API, workers, migrations               | PostgreSQL connection URL with TLS |
| `REDIS_URL`    | API, workers                           | Managed Redis TLS connection URL   |
| `RABBITMQ_URL` | API, workers                           | Cloud-reachable AMQP or AMQPS URL  |
| `GHCR_TOKEN`   | Azure image pull, private package only | GitHub token with `read:packages`  |

Container Apps secret names are normalized to:

```txt
database-url
redis-url
rabbitmq-url
```

Applications receive them through `secretref:` environment-variable references.

## Non-Secret Runtime Configuration

| Variable                        | Initial value               | Notes                  |
| ------------------------------- | --------------------------- | ---------------------- |
| `APP_PORT`                      | `3000`                      | API only               |
| `NODE_ENV`                      | `production`                | All runtime components |
| `LOG_LEVEL`                     | `info`                      | JSON log threshold     |
| `RABBITMQ_EXCHANGE`             | `eduflow.events`            | Topic exchange         |
| `RABBITMQ_EXCHANGE_TYPE`        | `topic`                     | Exchange type          |
| `OUTBOX_PUBLISHER_ENABLED`      | `true`                      | Outbox worker loop     |
| `OUTBOX_PUBLISHER_INTERVAL_MS`  | `5000`                      | Polling interval       |
| `OUTBOX_PUBLISH_LIMIT`          | `100`                       | Batch size             |
| `AUTOMATION_WORKER_ENABLED`     | `true`                      | Automation consumer    |
| `AUTOMATION_WORKER_QUEUE`       | `eduflow.automation.events` | Durable queue          |
| `AUTOMATION_WORKER_BINDING_KEY` | `lead-events.#`             | Topic binding          |
| `AUTOMATION_WORKER_PREFETCH`    | `10`                        | Consumer prefetch      |
| `WEBHOOK_TIMEOUT_MS`            | `5000`                      | Webhook timeout        |
| `WEBHOOK_MAX_ATTEMPTS`          | `3`                         | In-process attempts    |
| `WEBHOOK_RETRY_DELAY_MS`        | `1000`                      | Delay between attempts |

## Managed Service URLs

Examples below contain placeholders, not usable credentials:

```txt
DATABASE_URL=postgresql://<user>:<url-encoded-password>@<server>.postgres.database.azure.com:5432/eduflow?sslmode=require
REDIS_URL=rediss://:<url-encoded-access-key>@<cache>.redis.cache.windows.net:6380
RABBITMQ_URL=amqps://<user>:<url-encoded-password>@<broker-host>:5671/<vhost>
```

Passwords and access keys must be URL-encoded before they are embedded in connection URLs.
`localhost`, Docker Compose service names and private developer-machine addresses are invalid in
the cloud configuration.

## Provisioning Credentials

`AZURE_POSTGRES_ADMIN_PASSWORD` is needed by `create-resources.sh` to provision PostgreSQL. It is
not copied automatically into a runtime URL. The operator creates `DATABASE_URL` explicitly after
provisioning, which avoids scripts printing a credential-bearing URL.

Redis access keys can be retrieved with:

```bash
az redis list-keys \
  --name "$AZURE_REDIS_NAME" \
  --resource-group "$AZURE_RESOURCE_GROUP"
```

Do not paste the result into tickets, chat, logs or committed files.

## Private GHCR

Public GHCR packages require no registry credentials.

For a private package:

```txt
GHCR_USERNAME=<github-user-or-service-account>
GHCR_TOKEN=<token-with-read:packages>
```

Prefer a dedicated machine user or fine-grained credential with the smallest possible scope.
Revoke and replace it when access changes.

## Future Key Vault Strategy

The production direction is:

1. store database, Redis and RabbitMQ credentials in Azure Key Vault;
2. assign managed identities to Container Apps and the migration Job;
3. grant only secret-read permission to each workload;
4. replace direct secret values with Key Vault-backed Container Apps secret references;
5. configure rotation and audit alerts.

This is documented now but intentionally not automated in Phase 20.
