#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${SCRIPT_DIR}/env.local"

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "Missing ${ENV_FILE}. Copy env.example to env.local and configure it." >&2
  exit 1
fi

# shellcheck disable=SC1090
source "${ENV_FILE}"

require_command() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "Required command not found: $1" >&2
    exit 1
  }
}

require_variable() {
  local name="$1"

  if [[ -z "${!name:-}" ]]; then
    echo "Required variable is empty: ${name}" >&2
    exit 1
  fi
}

reject_local_url() {
  local name="$1"
  local value="${!name}"

  if [[ "${value}" == *"localhost"* || "${value}" == *"127.0.0.1"* || "${value}" == *"::1"* ]]; then
    echo "${name} must point to a cloud-reachable service, not localhost." >&2
    exit 1
  fi
}

container_app_exists() {
  az containerapp show \
    --name "$1" \
    --resource-group "${AZURE_RESOURCE_GROUP}" \
    --output none >/dev/null 2>&1
}

job_exists() {
  az containerapp job show \
    --name "$1" \
    --resource-group "${AZURE_RESOURCE_GROUP}" \
    --output none >/dev/null 2>&1
}

set_app_secrets() {
  az containerapp secret set \
    --name "$1" \
    --resource-group "${AZURE_RESOURCE_GROUP}" \
    --secrets \
      "database-url=${DATABASE_URL}" \
      "redis-url=${REDIS_URL}" \
      "rabbitmq-url=${RABBITMQ_URL}" \
    --output none
}

configure_private_registry_for_app() {
  local app_name="$1"

  if [[ -n "${GHCR_USERNAME:-}" && -n "${GHCR_TOKEN:-}" ]]; then
    az containerapp registry set \
      --name "${app_name}" \
      --resource-group "${AZURE_RESOURCE_GROUP}" \
      --server ghcr.io \
      --username "${GHCR_USERNAME}" \
      --password "${GHCR_TOKEN}" \
      --output none
  fi
}

deploy_app() {
  local app_name="$1"
  local min_replicas="$2"
  local max_replicas="$3"
  shift 3
  local create_args=("$@")
  local update_args=()
  local argument

  for argument in "${create_args[@]}"; do
    if [[ "${argument}" == "--env-vars" ]]; then
      update_args+=("--set-env-vars")
    else
      update_args+=("${argument}")
    fi
  done

  if container_app_exists "${app_name}"; then
    configure_private_registry_for_app "${app_name}"
    set_app_secrets "${app_name}"

    az containerapp update \
      --name "${app_name}" \
      --resource-group "${AZURE_RESOURCE_GROUP}" \
      --image "${CONTAINER_IMAGE}" \
      --cpu 0.5 \
      --memory 1.0Gi \
      --min-replicas "${min_replicas}" \
      --max-replicas "${max_replicas}" \
      "${update_args[@]}" \
      --output none
  else
    az containerapp create \
      --name "${app_name}" \
      --resource-group "${AZURE_RESOURCE_GROUP}" \
      --environment "${AZURE_CONTAINERAPPS_ENVIRONMENT}" \
      --image "${CONTAINER_IMAGE}" \
      --cpu 0.5 \
      --memory 1.0Gi \
      --min-replicas "${min_replicas}" \
      --max-replicas "${max_replicas}" \
      --secrets \
        "database-url=${DATABASE_URL}" \
        "redis-url=${REDIS_URL}" \
        "rabbitmq-url=${RABBITMQ_URL}" \
      "${REGISTRY_CREATE_ARGS[@]}" \
      "${create_args[@]}" \
      --output none
  fi

  set_app_secrets "${app_name}"
}

require_command az
require_command jq

for variable in \
  AZURE_SUBSCRIPTION_ID \
  AZURE_RESOURCE_GROUP \
  AZURE_CONTAINERAPPS_ENVIRONMENT \
  CONTAINER_IMAGE \
  API_APP_NAME \
  OUTBOX_WORKER_APP_NAME \
  AUTOMATION_WORKER_APP_NAME \
  MIGRATIONS_JOB_NAME \
  API_MIN_REPLICAS \
  API_MAX_REPLICAS \
  WORKER_MIN_REPLICAS \
  WORKER_MAX_REPLICAS \
  NODE_ENV \
  LOG_LEVEL \
  APP_PORT \
  DATABASE_URL \
  REDIS_URL \
  RABBITMQ_URL \
  RABBITMQ_EXCHANGE \
  RABBITMQ_EXCHANGE_TYPE \
  OUTBOX_PUBLISHER_ENABLED \
  OUTBOX_PUBLISHER_INTERVAL_MS \
  OUTBOX_PUBLISH_LIMIT \
  AUTOMATION_WORKER_ENABLED \
  AUTOMATION_WORKER_QUEUE \
  AUTOMATION_WORKER_BINDING_KEY \
  AUTOMATION_WORKER_PREFETCH \
  WEBHOOK_TIMEOUT_MS \
  WEBHOOK_MAX_ATTEMPTS \
  WEBHOOK_RETRY_DELAY_MS
do
  require_variable "${variable}"
done

for url_variable in DATABASE_URL REDIS_URL RABBITMQ_URL; do
  reject_local_url "${url_variable}"
done

if [[ "${APP_PORT}" != "3000" ]]; then
  echo "APP_PORT must be 3000 for the current API image." >&2
  exit 1
fi

if [[ "${WORKER_MIN_REPLICAS}" != "1" || "${WORKER_MAX_REPLICAS}" != "1" ]]; then
  echo "The first deployment requires worker min/max replicas to both be 1." >&2
  exit 1
fi

if [[ -n "${GHCR_USERNAME:-}" || -n "${GHCR_TOKEN:-}" ]]; then
  require_variable GHCR_USERNAME
  require_variable GHCR_TOKEN
fi

REGISTRY_CREATE_ARGS=()
if [[ -n "${GHCR_USERNAME:-}" && -n "${GHCR_TOKEN:-}" ]]; then
  REGISTRY_CREATE_ARGS=(
    --registry-server ghcr.io
    --registry-username "${GHCR_USERNAME}"
    --registry-password "${GHCR_TOKEN}"
  )
fi

az account set --subscription "${AZURE_SUBSCRIPTION_ID}"
az extension add --name containerapp --upgrade --only-show-errors

COMMON_ENV_VARS=(
  "NODE_ENV=${NODE_ENV}"
  "LOG_LEVEL=${LOG_LEVEL}"
  "DATABASE_URL=secretref:database-url"
  "REDIS_URL=secretref:redis-url"
  "RABBITMQ_URL=secretref:rabbitmq-url"
  "RABBITMQ_EXCHANGE=${RABBITMQ_EXCHANGE}"
  "RABBITMQ_EXCHANGE_TYPE=${RABBITMQ_EXCHANGE_TYPE}"
  "OUTBOX_PUBLISHER_ENABLED=${OUTBOX_PUBLISHER_ENABLED}"
  "OUTBOX_PUBLISHER_INTERVAL_MS=${OUTBOX_PUBLISHER_INTERVAL_MS}"
  "OUTBOX_PUBLISH_LIMIT=${OUTBOX_PUBLISH_LIMIT}"
  "AUTOMATION_WORKER_ENABLED=${AUTOMATION_WORKER_ENABLED}"
  "AUTOMATION_WORKER_QUEUE=${AUTOMATION_WORKER_QUEUE}"
  "AUTOMATION_WORKER_BINDING_KEY=${AUTOMATION_WORKER_BINDING_KEY}"
  "AUTOMATION_WORKER_PREFETCH=${AUTOMATION_WORKER_PREFETCH}"
  "WEBHOOK_TIMEOUT_MS=${WEBHOOK_TIMEOUT_MS}"
  "WEBHOOK_MAX_ATTEMPTS=${WEBHOOK_MAX_ATTEMPTS}"
  "WEBHOOK_RETRY_DELAY_MS=${WEBHOOK_RETRY_DELAY_MS}"
)

deploy_app \
  "${API_APP_NAME}" \
  "${API_MIN_REPLICAS}" \
  "${API_MAX_REPLICAS}" \
  --env-vars "APP_PORT=${APP_PORT}" "${COMMON_ENV_VARS[@]}"

az containerapp ingress enable \
  --name "${API_APP_NAME}" \
  --resource-group "${AZURE_RESOURCE_GROUP}" \
  --type external \
  --target-port 3000 \
  --transport auto \
  --allow-insecure false \
  --output none

API_RESOURCE_ID="$(
  az containerapp show \
    --name "${API_APP_NAME}" \
    --resource-group "${AZURE_RESOURCE_GROUP}" \
    --query id \
    --output tsv
)"

API_TEMPLATE="$(
  az containerapp show \
    --name "${API_APP_NAME}" \
    --resource-group "${AZURE_RESOURCE_GROUP}" \
    --query properties.template \
    --output json |
    jq \
      '.containers[0].probes = [
          {
            "type": "Liveness",
            "httpGet": {
              "path": "/health/live",
              "port": 3000,
              "scheme": "HTTP"
            },
            "initialDelaySeconds": 10,
            "periodSeconds": 10,
            "timeoutSeconds": 5,
            "failureThreshold": 3
          },
          {
            "type": "Readiness",
            "httpGet": {
              "path": "/health/ready",
              "port": 3000,
              "scheme": "HTTP"
            },
            "initialDelaySeconds": 10,
            "periodSeconds": 10,
            "timeoutSeconds": 5,
            "failureThreshold": 3,
            "successThreshold": 1
          }
        ]'
)"

API_PATCH_BODY="$(jq -n --argjson template "${API_TEMPLATE}" '{properties: {template: $template}}')"

az rest \
  --method patch \
  --uri "https://management.azure.com${API_RESOURCE_ID}?api-version=2025-01-01" \
  --headers "Content-Type=application/json" \
  --body "${API_PATCH_BODY}" \
  --output none

deploy_app \
  "${OUTBOX_WORKER_APP_NAME}" \
  "${WORKER_MIN_REPLICAS}" \
  "${WORKER_MAX_REPLICAS}" \
  --command npm \
  --args run start:worker:outbox:prod \
  --env-vars "${COMMON_ENV_VARS[@]}"

az containerapp ingress disable \
  --name "${OUTBOX_WORKER_APP_NAME}" \
  --resource-group "${AZURE_RESOURCE_GROUP}" \
  --output none

deploy_app \
  "${AUTOMATION_WORKER_APP_NAME}" \
  "${WORKER_MIN_REPLICAS}" \
  "${WORKER_MAX_REPLICAS}" \
  --command npm \
  --args run start:worker:automation:prod \
  --env-vars "${COMMON_ENV_VARS[@]}"

az containerapp ingress disable \
  --name "${AUTOMATION_WORKER_APP_NAME}" \
  --resource-group "${AZURE_RESOURCE_GROUP}" \
  --output none

if [[ -n "${MIGRATIONS_IMAGE:-}" ]]; then
  if [[ "${MIGRATIONS_IMAGE}" == "${CONTAINER_IMAGE}" ]]; then
    echo "MIGRATIONS_IMAGE must be a migration-capable image, not the current application image." >&2
    exit 1
  fi

  if job_exists "${MIGRATIONS_JOB_NAME}"; then
    az containerapp job secret set \
      --name "${MIGRATIONS_JOB_NAME}" \
      --resource-group "${AZURE_RESOURCE_GROUP}" \
      --secrets "database-url=${DATABASE_URL}" \
      --output none

    if [[ -n "${GHCR_USERNAME:-}" && -n "${GHCR_TOKEN:-}" ]]; then
      az containerapp job registry set \
        --name "${MIGRATIONS_JOB_NAME}" \
        --resource-group "${AZURE_RESOURCE_GROUP}" \
        --server ghcr.io \
        --username "${GHCR_USERNAME}" \
        --password "${GHCR_TOKEN}" \
        --output none
    fi

    az containerapp job update \
      --name "${MIGRATIONS_JOB_NAME}" \
      --resource-group "${AZURE_RESOURCE_GROUP}" \
      --image "${MIGRATIONS_IMAGE}" \
      --cpu 0.5 \
      --memory 1.0Gi \
      --command npm \
      --args run prisma:migrate:deploy \
      --set-env-vars \
        "NODE_ENV=production" \
        "DATABASE_URL=secretref:database-url" \
      --output none
  else
    az containerapp job create \
      --name "${MIGRATIONS_JOB_NAME}" \
      --resource-group "${AZURE_RESOURCE_GROUP}" \
      --environment "${AZURE_CONTAINERAPPS_ENVIRONMENT}" \
      --trigger-type Manual \
      --replica-timeout 1800 \
      --replica-retry-limit 1 \
      --replica-completion-count 1 \
      --parallelism 1 \
      --image "${MIGRATIONS_IMAGE}" \
      --cpu 0.5 \
      --memory 1.0Gi \
      --command npm \
      --args run prisma:migrate:deploy \
      --secrets "database-url=${DATABASE_URL}" \
      "${REGISTRY_CREATE_ARGS[@]}" \
      --env-vars \
        "NODE_ENV=production" \
        "DATABASE_URL=secretref:database-url" \
      --output none
  fi

  az containerapp job secret set \
    --name "${MIGRATIONS_JOB_NAME}" \
    --resource-group "${AZURE_RESOURCE_GROUP}" \
    --secrets "database-url=${DATABASE_URL}" \
    --output none

else
  echo "MIGRATIONS_IMAGE is empty; the migration Job was not created."
fi

API_FQDN="$(
  az containerapp show \
    --name "${API_APP_NAME}" \
    --resource-group "${AZURE_RESOURCE_GROUP}" \
    --query properties.configuration.ingress.fqdn \
    --output tsv
)"

echo "Container Apps deployment completed."
echo "API URL: https://${API_FQDN}"
echo "Validate: https://${API_FQDN}/health/live"
echo "Validate: https://${API_FQDN}/health/ready"
