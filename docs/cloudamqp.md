# CloudAMQP

## Purpose

CloudAMQP provides the external RabbitMQ broker used by the Render deployment. RabbitMQ is not
hosted inside Render and is not created by `render.yaml`.

## Create an Instance

1. Create a CloudAMQP account.
2. Open the CloudAMQP Console.
3. Choose **Create New Instance**.
4. Select a free or low-cost plan appropriate for a portfolio demo.
5. Choose a cloud provider and region near the Render services when possible.
6. Create the instance and wait until it is available.

Plan names, quotas and availability can change. Review the current CloudAMQP limits before creating
the instance.

## Get the Connection URL

Open the instance details page and copy the AMQP connection URL. It contains the broker hostname,
username, password and virtual host.

Example shape only:

```txt
amqps://<user>:<password>@<host>/<vhost>
```

Use the `amqps://` URL when CloudAMQP provides it so the connection uses TLS. Do not replace the
CloudAMQP virtual host or remove URL encoding from credentials.

## Configure Render

During the Render Blueprint setup:

1. find the `RABBITMQ_URL` prompt for `eduflow-api`;
2. paste the complete CloudAMQP connection URL;
3. save the secret;
4. confirm that both workers inherit the same value from the API service;
5. redeploy affected services if the value changes.

The application will declare the configured durable exchange, queue and binding when the publisher
or consumer starts.

## Validate Connectivity

Check API readiness:

```bash
curl --fail-with-body https://<api-url>/health/ready
```

Then inspect the CloudAMQP management interface to confirm that the application created:

- exchange `eduflow.events`;
- queue `eduflow.automation.events`;
- binding key `lead-events.#`;
- active connections from deployed processes.

## Secret Handling

`RABBITMQ_URL` is a secret because it includes credentials.

- never commit it to `render.yaml`, `.env.example`, documentation or source code;
- never paste it into issues, pull requests, screenshots or logs;
- store it only in Render secret settings and trusted local secret storage;
- rotate the CloudAMQP credentials immediately if the URL is exposed;
- use separate instances or credentials for unrelated environments.

The local Docker Compose broker continues to use the documented local-only URL and does not require
CloudAMQP.
