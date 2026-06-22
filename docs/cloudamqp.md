# CloudAMQP

## Purpose and Current Status

CloudAMQP provides the external RabbitMQ broker for the Render deployment. RabbitMQ is not hosted
inside Render and is not created by `render.yaml`.

status:

```txt
Instance created: TODO
Plan: TODO
Provider/region: TODO
RABBITMQ_URL configured in Render: TODO
API connection observed: TODO
Outbox Worker connection observed: TODO
Automation Worker connection observed: TODO
Exchange observed: TODO
Queue and consumer observed: TODO
```

Do not record the broker hostname, username, password, virtual host or complete connection URL in
tracked documentation.

## Create the Instance

1. Create a CloudAMQP account and open the CloudAMQP Console.
2. Choose **Create New Instance**.
3. Select a free or low-cost shared plan suitable for a portfolio demo.
4. Choose a provider and region near the Render services when possible.
5. Create the instance and wait until it is available.
6. Record only the non-secret plan and region in the deployment evidence.

Plan names, quotas and availability can change. Review the limits displayed by CloudAMQP before
creating the instance. Shared plans have connection, channel, queue, throughput and storage
constraints and are not a production substitute.

## Get the AMQP URL

Open the instance details page and copy the complete AMQP connection URL. It contains the broker
hostname, username, password and virtual host.

Example shape only:

```txt
amqps://<user>:<password>@<host>/<vhost>
```

Use the `amqps://` URL when CloudAMQP provides it. Preserve the virtual host and any URL-encoded
characters in the credentials.

## Configure `RABBITMQ_URL` in Render

During initial Blueprint creation:

1. find the `RABBITMQ_URL` prompt for `eduflow-api`;
2. paste the complete CloudAMQP URL;
3. save the secret;
4. finish applying the Blueprint;
5. inspect the Environment page of the API and both workers.

The workers reference the API service's secret through `fromService.envVarKey`. If the reference is
not available after creation, add `RABBITMQ_URL` manually to each worker and redeploy it.

For an existing Blueprint or credential rotation, Render does not prompt again for `sync: false`
variables. Update the value manually in every affected service and trigger a redeploy.

Never put the real URL in:

- `render.yaml`;
- `.env.example`;
- source code or tracked scripts;
- documentation, issues or pull requests;
- screenshots or copied logs.

## Expected RabbitMQ Topology

The deployed processes declare:

| Resource       | Expected value                                     |
| -------------- | -------------------------------------------------- |
| Exchange       | `eduflow.events`                                   |
| Exchange type  | `topic`                                            |
| Queue          | `eduflow.automation.events`                        |
| Binding key    | `lead-events.#`                                    |
| Queue consumer | Automation Worker                                  |
| Publisher      | Outbox Publisher Worker or diagnostic API endpoint |

The API readiness indicator opens a broker connection to validate RabbitMQ availability. Therefore,
the number of observed connections can vary as health checks run and connections close.

## Validate Connections and Topology

First check the API:

```bash
curl --fail-with-body https://<api-url>/health/ready
```

Then open the CloudAMQP management interface from the instance page.

### Connections

Open **Connections** and check:

- connections appear while the API or workers are active;
- the connection state is running;
- no repeated connection churn or authentication failures are visible;
- the plan's connection limit is not exhausted.

The exact generated connection names and source addresses are provider-controlled. Use timestamps
and Render logs to correlate each process instead of documenting credentials or hostnames.

### Exchanges

Open **Exchanges** and confirm:

- `eduflow.events` exists;
- its type is `topic`;
- it is durable;
- publish rates change when an OutboxMessage is published.

### Queues

Open **Queues** and select `eduflow.automation.events`. Confirm:

- the queue is durable;
- the binding to `eduflow.events` uses `lead-events.#`;
- the consumer count is at least one while the Automation Worker is running;
- ready messages do not grow indefinitely;
- deliver/ack rates change during the smoke test.

An empty queue after a successful test is expected when the Automation Worker consumes and
acknowledges messages quickly.

## Validate the End-to-End Flow

Use the smoke test in [Render Deployment](render-deployment.md):

1. create and activate an automation;
2. register a matching LeadEvent;
3. wait for the Outbox Publisher interval;
4. confirm exchange publish activity;
5. confirm queue delivery and acknowledgement;
6. confirm the OutboxMessage is `PUBLISHED`;
7. confirm the lead score and status changed.

Do not mark CloudAMQP as validated from `/health/ready` alone. Readiness proves connectivity at that
moment; the asynchronous test proves publication, routing and consumption.

## Troubleshooting

### Authentication failure

- copy the complete URL again from the CloudAMQP instance details;
- preserve the virtual host and URL encoding;
- remove accidental quotes, spaces or line breaks in Render;
- verify that all three Render services use the current credential;
- rotate credentials if the URL might have been exposed.

### TLS or connection timeout

- prefer the provider's `amqps://` URL;
- confirm the CloudAMQP instance status;
- check provider incidents and Render service logs;
- confirm the selected plan has available connections and transfer quota.

### Connection limit reached

- inspect **Connections** for stale or excessive clients;
- restart only the affected Render service if it is reconnecting incorrectly;
- avoid unnecessary duplicate worker instances;
- upgrade the CloudAMQP plan only after reviewing portfolio cost.

### Exchange exists but queue does not

The Outbox Publisher can declare the exchange without declaring the Automation Worker queue. Start
or redeploy `eduflow-automation-worker` and inspect its logs.

### Queue exists but has no consumer

The Automation Worker is stopped or failed during startup. Confirm its `RABBITMQ_URL`,
`AUTOMATION_WORKER_ENABLED=true`, queue settings and Render logs.

### Messages accumulate as ready

The publisher and routing are working, but the consumer is absent or failing. Inspect the
Automation Worker logs and queue consumer count.

### Messages are published but never enter the queue

- confirm the binding key is `lead-events.#`;
- confirm published routing keys use the `lead-events.<eventType>` format;
- confirm the exchange type is `topic`;
- redeploy the Automation Worker if the binding was never declared.

### No topology appears

- confirm the workers were actually created and started;
- confirm `RABBITMQ_URL` exists in each service;
- inspect startup logs before assuming the broker is empty;
- remember that an API-only no-cost deployment does not create the worker queue unless the
  Automation Worker has run.

## Plan Limitations

CloudAMQP free or shared plans are suitable only for this public portfolio demo. Limits can include:

- a small number of simultaneous connections;
- channel limits per connection;
- queue and message constraints;
- monthly transfer or throughput quotas;
- limited storage and monitoring retention;
- no production availability commitment for the demo.

Record only limits actually observed during deployment. Do not claim a limit was reached without
provider evidence.

## Local Reference

Docker Compose remains the complete local reference and runs RabbitMQ with its management
interface. The local-only URL and credentials documented in `.env.example` are not CloudAMQP
credentials.

## Provider References

- [CloudAMQP documentation](https://www.cloudamqp.com/docs/index.html)
- [CloudAMQP FAQ](https://www.cloudamqp.com/docs/faq.html)
