# Deployment Strategy

## Overview

EduFlow Marketing Automation is designed to be deployed as a cloud-native application using containers.

The deployment strategy will support three environments:

- Development
- Staging
- Production

## Environment Strategy

### Local

Used by developers to run the full stack locally.

Local dependencies:

- PostgreSQL
- Redis
- RabbitMQ
- Prometheus
- Grafana

The local environment will be managed with Docker Compose.

### Development

Automatically deployed from the `develop` branch.

Purpose:

- Validate integrated features
- Test API behavior
- Validate workers
- Run smoke tests
- Inspect logs and metrics

### Staging

Automatically deployed from `release/*` branches.

Purpose:

- Validate production candidate versions
- Run database migrations
- Run end-to-end tests
- Validate release notes
- Verify rollback strategy

### Production

Deployed from version tags created from the `main` branch.

Examples:

- `v1.0.0`
- `v1.0.1`
- `v1.1.0`

Production deployment should require manual approval.

## Azure Target Architecture

The primary cloud target is Azure.

Planned Azure resources:

- Azure Container Registry
- Azure Container Apps
- Azure Database for PostgreSQL Flexible Server
- Azure Cache for Redis
- Azure Service Bus
- Azure Key Vault
- Azure Application Insights
- Azure Monitor
- Log Analytics Workspace

## Container Apps

The application will be split into multiple container apps:

- `eduflow-api`
- `eduflow-outbox-worker`
- `eduflow-automation-worker`
- `eduflow-webhook-worker`

## Deployment Flow

### Development

Trigger:

- Merge into `develop`

Steps:

1. Install dependencies
2. Run lint
3. Run type check
4. Run unit tests
5. Run integration tests
6. Build Docker images
7. Push images to container registry
8. Deploy to Azure development environment
9. Run smoke tests

### Staging

Trigger:

- Push to `release/*`

Steps:

1. Run full validation pipeline
2. Build versioned Docker images
3. Push images to container registry
4. Run database migrations
5. Deploy to staging
6. Run end-to-end tests
7. Generate release candidate evidence

### Production

Trigger:

- Push tag from `main`

Example:

- `v1.0.0`

Steps:

1. Validate tag
2. Build or promote versioned Docker images
3. Apply database migrations
4. Deploy API and workers
5. Run smoke tests
6. Monitor logs and metrics

## Rollback Strategy

The rollback strategy will be based on:

- Immutable Docker image tags
- Database migration review
- Versioned releases
- Previous stable container image
- Documented manual rollback steps

## Secrets Strategy

Secrets must not be committed to the repository.

Secrets will be managed using:

- `.env.example` for local documentation
- GitHub Actions secrets for CI/CD
- Azure Key Vault for cloud environments

## Deployment Status

Current status:

- Not implemented yet
