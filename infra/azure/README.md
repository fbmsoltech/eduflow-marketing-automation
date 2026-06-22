# Azure Deployment Scripts

These Bash scripts prepare a manual Azure Container Apps deployment:

```txt
create-resources.sh       Provision shared Azure resources
deploy-container-apps.sh Deploy API, workers and the migration Job definition
run-migrations.sh        Start the manual migration Job
env.example              Configuration template without real secrets
```

## Usage

```bash
cp infra/azure/env.example infra/azure/env.local
bash infra/azure/create-resources.sh
bash infra/azure/deploy-container-apps.sh
bash infra/azure/run-migrations.sh
```

All scripts load `infra/azure/env.local` relative to their own directory, regardless of the current
working directory. They use `set -euo pipefail`, validate required variables and never embed real
secrets. The deployment script also requires `jq` to preserve the complete API container template
while adding health probes.

See:

- [Azure Deployment](../../docs/azure-deployment.md)
- [Azure Secrets](../../docs/azure-secrets.md)
- [Azure Runbook](../../docs/azure-runbook.md)
