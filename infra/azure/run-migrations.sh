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

require_variable() {
  local name="$1"

  if [[ -z "${!name:-}" ]]; then
    echo "Required variable is empty: ${name}" >&2
    exit 1
  fi
}

command -v az >/dev/null 2>&1 || {
  echo "Required command not found: az" >&2
  exit 1
}

for variable in \
  AZURE_SUBSCRIPTION_ID \
  AZURE_RESOURCE_GROUP \
  MIGRATIONS_JOB_NAME \
  MIGRATIONS_IMAGE \
  CONTAINER_IMAGE
do
  require_variable "${variable}"
done

if [[ "${MIGRATIONS_IMAGE}" == "${CONTAINER_IMAGE}" ]]; then
  echo "Refusing to run migrations with the application image." >&2
  echo "Set MIGRATIONS_IMAGE to an image containing Prisma CLI, schema and migrations." >&2
  exit 1
fi

az account set --subscription "${AZURE_SUBSCRIPTION_ID}"

if ! az containerapp job show \
  --name "${MIGRATIONS_JOB_NAME}" \
  --resource-group "${AZURE_RESOURCE_GROUP}" \
  --output none >/dev/null 2>&1
then
  echo "Migration Job not found. Run deploy-container-apps.sh first." >&2
  exit 1
fi

EXECUTION_NAME="$(
  az containerapp job start \
    --name "${MIGRATIONS_JOB_NAME}" \
    --resource-group "${AZURE_RESOURCE_GROUP}" \
    --query name \
    --output tsv
)"

echo "Migration Job started: ${EXECUTION_NAME}"
echo "Inspect executions with:"
echo "az containerapp job execution list --name ${MIGRATIONS_JOB_NAME} --resource-group ${AZURE_RESOURCE_GROUP} --output table"

