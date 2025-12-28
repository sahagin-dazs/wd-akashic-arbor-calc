const { CosmosClient } = require("@azure/cosmos");

function getCosmosConfig() {
  const endpoint = process.env.COSMOSDB_ENDPOINT;
  const key = process.env.COSMOSDB_KEY;
  const databaseId = process.env.COSMOSDB_DB || "appdata";
  const containerId = process.env.COSMOSDB_CONTAINER || "items";
  if (!endpoint || !key) {
    throw new Error("COSMOSDB_ENDPOINT and COSMOSDB_KEY must be set in app settings.");
  }
  return { endpoint, key, databaseId, containerId };
}

let cachedContainer = null;

function getContainer() {
  if (cachedContainer) return cachedContainer;
  const { endpoint, key, databaseId, containerId } = getCosmosConfig();
  const client = new CosmosClient({ endpoint, key });
  cachedContainer = client.database(databaseId).container(containerId);
  return cachedContainer;
}

module.exports = { getContainer, getCosmosConfig };
