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

resource_exists() {
  local resource_type="$1"
  local resource_name="$2"

  az resource show \
    --resource-group "${AZURE_RESOURCE_GROUP}" \
    --resource-type "${resource_type}" \
    --name "${resource_name}" \
    --output none >/dev/null 2>&1
}

require_command az

for variable in \
  AZURE_SUBSCRIPTION_ID \
  AZURE_LOCATION \
  AZURE_RESOURCE_GROUP \
  AZURE_LOG_ANALYTICS_WORKSPACE \
  AZURE_CONTAINERAPPS_ENVIRONMENT \
  AZURE_POSTGRES_SERVER \
  AZURE_POSTGRES_DATABASE \
  AZURE_POSTGRES_ADMIN_USER \
  AZURE_POSTGRES_ADMIN_PASSWORD \
  AZURE_POSTGRES_SKU \
  AZURE_POSTGRES_VERSION \
  AZURE_POSTGRES_PUBLIC_ACCESS \
  AZURE_REDIS_NAME \
  AZURE_REDIS_SKU \
  AZURE_REDIS_VM_SIZE
do
  require_variable "${variable}"
done

az account set --subscription "${AZURE_SUBSCRIPTION_ID}"
az extension add --name containerapp --upgrade --only-show-errors

if ! az group show --name "${AZURE_RESOURCE_GROUP}" --output none >/dev/null 2>&1; then
  az group create \
    --name "${AZURE_RESOURCE_GROUP}" \
    --location "${AZURE_LOCATION}" \
    --output none
fi

if ! resource_exists \
  "Microsoft.OperationalInsights/workspaces" \
  "${AZURE_LOG_ANALYTICS_WORKSPACE}"
then
  az monitor log-analytics workspace create \
    --resource-group "${AZURE_RESOURCE_GROUP}" \
    --workspace-name "${AZURE_LOG_ANALYTICS_WORKSPACE}" \
    --location "${AZURE_LOCATION}" \
    --output none
fi

LOG_ANALYTICS_CUSTOMER_ID="$(
  az monitor log-analytics workspace show \
    --resource-group "${AZURE_RESOURCE_GROUP}" \
    --workspace-name "${AZURE_LOG_ANALYTICS_WORKSPACE}" \
    --query customerId \
    --output tsv
)"

LOG_ANALYTICS_SHARED_KEY="$(
  az monitor log-analytics workspace get-shared-keys \
    --resource-group "${AZURE_RESOURCE_GROUP}" \
    --workspace-name "${AZURE_LOG_ANALYTICS_WORKSPACE}" \
    --query primarySharedKey \
    --output tsv
)"

if ! resource_exists \
  "Microsoft.App/managedEnvironments" \
  "${AZURE_CONTAINERAPPS_ENVIRONMENT}"
then
  az containerapp env create \
    --name "${AZURE_CONTAINERAPPS_ENVIRONMENT}" \
    --resource-group "${AZURE_RESOURCE_GROUP}" \
    --location "${AZURE_LOCATION}" \
    --logs-workspace-id "${LOG_ANALYTICS_CUSTOMER_ID}" \
    --logs-workspace-key "${LOG_ANALYTICS_SHARED_KEY}" \
    --output none
fi

unset LOG_ANALYTICS_SHARED_KEY

if ! resource_exists \
  "Microsoft.DBforPostgreSQL/flexibleServers" \
  "${AZURE_POSTGRES_SERVER}"
then
  az postgres flexible-server create \
    --name "${AZURE_POSTGRES_SERVER}" \
    --resource-group "${AZURE_RESOURCE_GROUP}" \
    --location "${AZURE_LOCATION}" \
    --admin-user "${AZURE_POSTGRES_ADMIN_USER}" \
    --admin-password "${AZURE_POSTGRES_ADMIN_PASSWORD}" \
    --sku-name "${AZURE_POSTGRES_SKU}" \
    --version "${AZURE_POSTGRES_VERSION}" \
    --public-access "${AZURE_POSTGRES_PUBLIC_ACCESS}" \
    --output none
fi

if ! az postgres flexible-server db show \
  --server-name "${AZURE_POSTGRES_SERVER}" \
  --resource-group "${AZURE_RESOURCE_GROUP}" \
  --database-name "${AZURE_POSTGRES_DATABASE}" \
  --output none >/dev/null 2>&1
then
  az postgres flexible-server db create \
    --server-name "${AZURE_POSTGRES_SERVER}" \
    --resource-group "${AZURE_RESOURCE_GROUP}" \
    --database-name "${AZURE_POSTGRES_DATABASE}" \
    --output none
fi

if ! resource_exists "Microsoft.Cache/Redis" "${AZURE_REDIS_NAME}"; then
  az redis create \
    --name "${AZURE_REDIS_NAME}" \
    --resource-group "${AZURE_RESOURCE_GROUP}" \
    --location "${AZURE_LOCATION}" \
    --sku "${AZURE_REDIS_SKU}" \
    --vm-size "${AZURE_REDIS_VM_SIZE}" \
    --enable-non-ssl-port false \
    --output none
fi

POSTGRES_HOST="$(
  az postgres flexible-server show \
    --name "${AZURE_POSTGRES_SERVER}" \
    --resource-group "${AZURE_RESOURCE_GROUP}" \
    --query fullyQualifiedDomainName \
    --output tsv
)"

REDIS_HOST="$(
  az redis show \
    --name "${AZURE_REDIS_NAME}" \
    --resource-group "${AZURE_RESOURCE_GROUP}" \
    --query hostName \
    --output tsv
)"

echo "Azure resources are ready."
echo "PostgreSQL host: ${POSTGRES_HOST}"
echo "Redis host: ${REDIS_HOST}:6380"
echo "Next: configure DATABASE_URL, REDIS_URL and RABBITMQ_URL in env.local."

