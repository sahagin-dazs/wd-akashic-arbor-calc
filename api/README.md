# Local API dev (Azure Functions)

Prereqs:
- Node 20 (matches SWA) and npm.
- Azure Functions Core Tools v4 (`npm i -g azure-functions-core-tools@4 --unsafe-perm true`) and Azurite or a real storage connection string.
- Cosmos DB key + endpoint (from your Azure portal).

Setup:
1) Copy sample settings and fill in secrets:
   ```bash
   cd api
   cp local.settings.sample.json local.settings.json
   # edit local.settings.json with COSMOSDB_KEY and, if needed, a real AzureWebJobsStorage connection string
   ```
   If you use `UseDevelopmentStorage=true`, start Azurite in another terminal: `azurite --silent`.
2) Install deps:
   ```bash
   npm ci
   ```

Run API locally:
```bash
npm start          # runs `func start` on http://localhost:7071
```

Run via Docker Compose (API + Azurite):
```bash
# from repo root
docker compose up wdtools-api
# API available on http://localhost:7071, Azurite on 10000-10002
```

- To avoid hitting live Cosmos in local runs, set a file-backed store:
  - Use `USE_LOCAL_DB=true` (optional `LOCAL_DATA_PATH=/app/api/.data/items.json`) in your env or docker-compose service.
  - Data persists in the mounted volume (see docker-compose.yml).
- To use real Cosmos locally, set `COSMOSDB_ENDPOINT` and `COSMOSDB_KEY` in `local.settings.json` or env vars.

Frontend + API together:
- Set the frontend to hit the local API: `VITE_API_BASE=http://localhost:7071/api npm run dev` (from repo root).
- Functions will serve the API; Vite serves the app at port 5173.

Endpoints summary:
- `POST /api/items` -> create item (returns editToken)
- `GET /api/items/{id}` -> fetch item
- `POST /api/items/{id}` -> update (needs `x-edit-token` header or `editToken` in body)
- `POST /api/items/{id}/votes` -> increment votes (optional `{ "delta": number }`)
- `POST /api/items/{id}/comments` -> append comment `{ author?, body }`
