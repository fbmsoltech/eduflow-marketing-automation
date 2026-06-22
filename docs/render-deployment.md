# Render Deployment

## Purpose and Current Status

Render is the active public-demo target for EduFlow. The deployment uses one public API service,
PostgreSQL and CloudAMQP as the external RabbitMQ broker. Two Render Background Workers provide the
complete asynchronous flow when paid worker capacity is enabled.

This environment is a public portfolio demonstration, not a production environment. Use only
synthetic data.

Phase 22 documented the first-deployment runbook, but the repository does not contain completed
provider evidence. Current documentation status:

```txt
Deploy executed: PENDING EVIDENCE
Public API URL: RENDER_API_URL
CloudAMQP instance: PENDING EVIDENCE
Prisma migrations: PENDING EVIDENCE
Health checks: PENDING EVIDENCE
Workers: PENDING EVIDENCE
Outbox publication: PENDING EVIDENCE
Automation result: PENDING EVIDENCE
```

`RENDER_API_URL` is a placeholder. No public URL or successful check should be recorded until it
has been observed in the provider dashboards and verified through an HTTP request.

## Architecture

```txt
Internet
   |
   v
Render Web Service: eduflow-api
   |
   +--> Render PostgreSQL: eduflow-postgres
   +--> CloudAMQP: external RabbitMQ

Render Worker: eduflow-outbox-worker
   |
   +--> PostgreSQL
   +--> CloudAMQP

Render Worker: eduflow-automation-worker
   |
   +--> PostgreSQL
   +--> CloudAMQP
```

The repository-root `render.yaml` is the Render Blueprint. It builds the existing Dockerfile for
all application processes. Redis is not used by the current remote implementation and remains part
of the complete local Docker Compose reference.

## Prerequisites

- a Render account connected to the GitHub repository;
- a CloudAMQP instance and its complete AMQP URL;
- the deployment branch pushed to GitHub;
- a trusted local Node.js environment for running Prisma migrations against a Free database;
- review of the selected Render and CloudAMQP plans before creating resources.

Do not commit connection URLs, passwords, tokens, copied environment exports or screenshots that
expose credentials.

## First Deployment Runbook

### 1. Create CloudAMQP

Create the CloudAMQP instance before applying the Blueprint. Copy its complete `amqps://` URL and
keep it in trusted secret storage. See [CloudAMQP](cloudamqp.md).

### 2. Push and select the deployment branch

Push the reviewed branch containing `render.yaml`. In the Render Dashboard, choose
**New > Blueprint**, connect this repository and confirm the intended branch before applying it.

The first portfolio deployment can use this task branch for validation. After the pull request is
merged, point the long-lived demo at the repository branch selected by the project release flow.

### 3. Review Blueprint resources

Confirm that Render detects:

| Resource                    | Type              | Plan in Blueprint | Command                                               |
| --------------------------- | ----------------- | ----------------- | ----------------------------------------------------- |
| `eduflow-api`               | Web Service       | `free`            | `node dist/apps/api/main.js`                          |
| `eduflow-outbox-worker`     | Background Worker | `starter`         | `node dist/apps/api/workers/outbox-publisher/main.js` |
| `eduflow-automation-worker` | Background Worker | `starter`         | `node dist/apps/api/workers/automation/main.js`       |
| `eduflow-postgres`          | Render PostgreSQL | `free`            | Managed by Render                                     |

Background Workers do not support the Free instance type. Applying the Blueprint with both workers
can create billable resources. Stop before applying it if the selected workspace and plans do not
match the intended budget.

### 4. Configure secrets

During initial Blueprint creation, Render prompts for `RABBITMQ_URL` because the API declares it
with `sync: false`. Paste the complete CloudAMQP URL without quotes or whitespace.

The two workers reference the API service's `RABBITMQ_URL` through `fromService.envVarKey`. After
the Blueprint is created, inspect each service's **Environment** page and confirm that both
`DATABASE_URL` and `RABBITMQ_URL` are present.

If the Blueprint reference is not resolved in the created workspace:

1. add `RABBITMQ_URL` manually to each worker;
2. use the same CloudAMQP URL;
3. save the variables;
4. redeploy both workers;
5. never write the value into `render.yaml`.

`DATABASE_URL` is injected from `eduflow-postgres` by the Blueprint. Render services in the same
region use the database's internal connection string.

Important Blueprint behavior: `sync: false` prompts only during initial Blueprint creation. For an
existing Blueprint or a rotated credential, update the variable manually in the Render Dashboard.

### 5. Wait for the initial builds

Open each service's **Events** page and wait for its deploy to finish. A successful image build does
not prove that the database schema, broker connection or workers are healthy.

Record only observed results:

```txt
API deploy event:
Outbox Worker deploy event:
Automation Worker deploy event:
PostgreSQL available:
```

### 6. Apply Prisma migrations

Only committed migrations may be applied. Never run `prisma migrate dev` against the Render
database.

The current runtime image intentionally excludes Prisma CLI and migration files. Render Free Web
Services also do not provide Shell access or one-off jobs. For the first Free deployment, run the
migration from a trusted local terminal using the database's external URL.

In the Render Dashboard:

1. open `eduflow-postgres`;
2. choose **Connect**;
3. copy the **External Database URL**;
4. keep the URL only for the current trusted terminal session.

PowerShell:

```powershell
npm ci
npm run prisma:generate
$env:DATABASE_URL = '<render-external-database-url>'
npm run prisma:migrate:deploy
Remove-Item Env:DATABASE_URL
```

Bash:

```bash
npm ci
npm run prisma:generate
DATABASE_URL='<render-external-database-url>' npm run prisma:migrate:deploy
```

Expected Prisma output must show the committed migration as applied or report that no pending
migrations exist. Record the result without copying the database URL:

```txt
Migration command date:
Migration result:
Applied migration:
```

On a paid service, a future deployment change may add a Render pre-deploy migration command, but it
requires an image stage that contains Prisma CLI and the migration files. That change is not part of
this runbook.

### 7. Validate API health

Copy the `onrender.com` URL displayed on the `eduflow-api` service page and set it locally:

PowerShell:

```powershell
$env:API_URL = 'RENDER_API_URL'
curl.exe --fail-with-body "$env:API_URL/health/live"
curl.exe --fail-with-body "$env:API_URL/health/ready"
curl.exe --fail-with-body "$env:API_URL/health"
curl.exe --fail-with-body "$env:API_URL/metrics"
```

Bash:

```bash
export API_URL='RENDER_API_URL'
curl --fail-with-body "$API_URL/health/live"
curl --fail-with-body "$API_URL/health/ready"
curl --fail-with-body "$API_URL/health"
curl --fail-with-body "$API_URL/metrics"
```

Expected results:

- `/health/live`: HTTP 200 and process status `up`;
- `/health/ready`: HTTP 200 with PostgreSQL and RabbitMQ status `up`;
- `/health`: HTTP 200 with `status: ok`;
- `/metrics`: HTTP 200 with Prometheus text metrics.

The first request can take about a minute after an idle period because a Free Web Service spins down
after 15 minutes without inbound traffic.

### 8. Run the API and automation smoke test

Use unique slugs, email addresses and idempotency keys when repeating this test. The examples below
use placeholders that must be replaced with IDs returned by previous requests.

The maintained end-to-end curl walkthrough is available in [API Examples](api-examples.md). The
short sequence below is retained as a deployment smoke test.

Create an organization:

```bash
curl --fail-with-body -X POST "$API_URL/organizations" \
  -H "Content-Type: application/json" \
  -d '{"name":"EduFlow Portfolio Demo","slug":"eduflow-portfolio-demo-001"}'
```

Create a campaign:

```bash
curl --fail-with-body -X POST "$API_URL/campaigns" \
  -H "Content-Type: application/json" \
  -d '{
    "organizationId":"ORGANIZATION_ID",
    "name":"Render First Deploy",
    "slug":"render-first-deploy-001"
  }'
```

Create a lead:

```bash
curl --fail-with-body -X POST "$API_URL/leads" \
  -H "Content-Type: application/json" \
  -d '{
    "organizationId":"ORGANIZATION_ID",
    "campaignId":"CAMPAIGN_ID",
    "email":"render-demo-001@example.com",
    "fullName":"Render Demo Lead"
  }'
```

Create an automation that changes both score and status:

```bash
curl --fail-with-body -X POST "$API_URL/automations" \
  -H "Content-Type: application/json" \
  -d '{
    "organizationId":"ORGANIZATION_ID",
    "campaignId":"CAMPAIGN_ID",
    "name":"Score submitted forms",
    "triggerEventType":"form.submitted",
    "conditions":[],
    "actions":[
      {"type":"INCREASE_LEAD_SCORE","config":{"amount":25}},
      {"type":"UPDATE_LEAD_STATUS","config":{"status":"ENGAGED"}}
    ]
  }'
```

Activate it:

```bash
curl --fail-with-body -X PATCH "$API_URL/automations/AUTOMATION_ID/status" \
  -H "Content-Type: application/json" \
  -d '{"status":"ACTIVE"}'
```

Create the matching LeadEvent:

```bash
curl --fail-with-body -X POST "$API_URL/lead-events" \
  -H "Content-Type: application/json" \
  -d '{
    "organizationId":"ORGANIZATION_ID",
    "campaignId":"CAMPAIGN_ID",
    "leadId":"LEAD_ID",
    "eventType":"form.submitted",
    "occurredAt":"2026-06-22T12:00:00.000Z",
    "payload":{"source":"render-first-deploy"},
    "correlationId":"render-first-deploy-001",
    "idempotencyKey":"ORGANIZATION_ID:form.submitted:render-first-deploy-001"
  }'
```

Wait at least one Outbox Publisher interval, then validate:

```bash
curl --fail-with-body "$API_URL/outbox/messages"
curl --fail-with-body "$API_URL/leads/LEAD_ID"
curl --fail-with-body "$API_URL/metrics"
```

The test passes only when:

- the matching OutboxMessage has status `PUBLISHED`, a `publishedAt` value and at least one attempt;
- the Outbox Worker logs report a successful publication;
- the Automation Worker logs report consumption and successful evaluation;
- the lead has score `25` and status `ENGAGED`;
- the succeeded automation execution metric increased.

If paid workers were intentionally not created, do not claim this asynchronous test passed. The
API-only deployment can still validate persistence and health, while the full worker flow remains a
Docker Compose demonstration.

## Inspect Render Logs

For each service:

1. open the service in the Render Dashboard;
2. select **Logs**;
3. choose the time window that includes the deploy or smoke test;
4. filter by correlation ID, event ID, `error`, `published`, `consumed` or the worker cycle message;
5. inspect **Events** separately for build, deploy, restart and environment changes.

Useful evidence:

- API startup and request logs;
- Outbox Worker cycle result;
- Automation Worker broker connection and message handling;
- Prisma, PostgreSQL or RabbitMQ errors;
- timestamps that correlate with the smoke test.

Do not copy secrets from logs into documentation, issues or pull requests.

## Troubleshooting

### Blueprint does not prompt for `RABBITMQ_URL`

`sync: false` prompts only during initial Blueprint creation. For an existing Blueprint, add or
update `RABBITMQ_URL` manually in the API Environment page and redeploy. Confirm the worker
references, or add the same secret manually to each worker if needed.

### API deploys but `/health/ready` returns 503

- check whether Prisma migrations were applied;
- confirm `DATABASE_URL` exists and references `eduflow-postgres`;
- confirm `RABBITMQ_URL` is the complete CloudAMQP URL;
- inspect API logs to identify whether the failing indicator is `database` or `rabbitmq`;
- confirm the CloudAMQP instance is running and has not reached a plan limit.

### Prisma reports a connection or timeout error

- use the Render database's external URL from the **Connect** menu for local migration;
- confirm the database status is **Available**;
- check Render Postgres inbound IP rules;
- remove surrounding quotes or whitespace from the session variable;
- do not substitute the internal Render hostname from outside Render.

### Prisma reports missing tables after a successful API deploy

The Docker image build does not apply migrations. Run `npm run prisma:migrate:deploy` against the
Render external database URL and redeploy or recheck readiness.

### Worker exits during startup

- verify `DATABASE_URL` and `RABBITMQ_URL` in that worker's Environment page;
- verify the compiled `dockerCommand` path shown in this document;
- inspect CloudAMQP connection limits;
- confirm the selected worker plan is active and billable capacity was accepted.

### OutboxMessage remains `PENDING`

- confirm `eduflow-outbox-worker` is deployed and running;
- verify `OUTBOX_PUBLISHER_ENABLED=true`;
- inspect the worker cycle logs;
- confirm CloudAMQP accepts connections;
- for diagnostic use only, call `POST /outbox/messages/publish` and inspect its response.

### OutboxMessage is `PUBLISHED` but the lead does not change

- confirm `eduflow-automation-worker` is running;
- confirm the automation is `ACTIVE`;
- confirm `triggerEventType` matches the LeadEvent `eventType`;
- inspect queue depth and consumers in CloudAMQP;
- verify the queue binding key is `lead-events.#`;
- inspect Automation Worker logs using the event or correlation ID.

### CloudAMQP queue grows without consumers

The Automation Worker is disconnected, stopped or failing before consumption. Check its Render
logs and environment variables, then confirm that CloudAMQP shows an active consumer on
`eduflow.automation.events`.

### First request is slow or times out

A Free Web Service spins down after 15 minutes without inbound traffic. Retry after the service
wakes and inspect the Events page if it does not become available.

### Free PostgreSQL cannot be created

A workspace can have only one active Free Render Postgres database. Delete an unused Free database
or select a paid database plan after reviewing cost.

### Free PostgreSQL expired

Free Render Postgres expires 30 days after creation. Treat demo data as disposable, recreate the
database, reapply committed migrations and rerun the synthetic smoke test.

## Deployment Evidence

Fill this section only after execution:

```txt
Execution date:
Git commit deployed:
Public API URL:
CloudAMQP plan/region (no credentials):
Render plans/region:
Migration result:
/health/live:
/health/ready:
/health:
/metrics:
Organization/Campaign/Lead created:
Automation activated:
LeadEvent created:
OutboxMessage PUBLISHED:
Automation Worker consumed:
Lead score/status changed:
Observed limitations:
Required adjustments:
```

## GHCR and Local Reference

The existing GitHub Actions workflow continues publishing versioned Docker images to GHCR. The
Blueprint builds the same Dockerfile directly from the linked repository; GHCR remains the image
registry and an alternative manual Render image source.

Docker Compose remains the authoritative complete local environment for PostgreSQL, Redis,
RabbitMQ, migrations, the API and both workers.

## Provider References

- [Render Blueprint YAML Reference](https://render.com/docs/blueprint-spec)
- [Render Free Instances](https://render.com/docs/free)
- [Render Postgres connections](https://render.com/docs/postgresql-creating-connecting)
- [Render deploys and logs](https://render.com/docs/deploys)
- [Render Prisma deployment guide](https://render.com/docs/deploy-prisma-orm)
