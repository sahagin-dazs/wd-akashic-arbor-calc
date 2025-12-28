# Azure deployment (Static Web App + Functions + Cosmos free tier)

What this Terraform does:
- Resource group, Cosmos DB Serverless with the free tier flag (one free account per subscription).
- Azure Static Web App (Free tier) for the Vite build and managed API (Functions inside SWA).

## Prereqs
- Terraform >= 1.5 and Azure CLI logged in (`az login`) with the right subscription selected.
- Free-tier Cosmos still available on your subscription; otherwise set `enable_free_tier = false` or reuse an existing account.
- Choose a short, lowercase `prefix` (letters/numbers only, 3–18 chars). Storage and Cosmos names must be globally unique.
- Static Web App regions are limited: `westus2`, `centralus`, `eastus2`, `westeurope`, `eastasia` (set `static_site_location` accordingly).

## Usage
```bash
cd infra/terraform
terraform init
terraform plan -out tfplan
terraform apply tfplan
```

Key outputs:
- `static_site_default_hostname` – your static site URL.
- `cosmosdb_endpoint` – DB endpoint (keys are in the Function App app settings).

## Deploy steps after `apply`
- Build frontend and managed API (Functions under `api/`) then upload to Static Web Apps:
  ```bash
  npm run build
  az staticwebapp upload \
    --name <prefix>-swa \
    --resource-group <prefix>-rg \
    --source ./dist \
    --api-location ./api
  ```
  (If you prefer GitHub Actions, set repository settings on the Static Web App and let SWA manage the workflow.)
- Frontend config: set `VITE_API_BASE` to the SWA API base (typically `/api` when served via SWA).

## Variables
- `prefix` (string): base name for all resources (lowercase letters/numbers).
- `location` (string): Azure region for most resources (default `eastus2`).
- `static_site_location` (string): region for Static Web App (default `eastus2`; must be in allowed list).
- `enable_free_tier` (bool): request Cosmos Free Tier (default `true`).
