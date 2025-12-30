const { safeJson } = require("../shared/utils");
const { getContainer, getCosmosConfig } = require("../shared/cosmosClient");

module.exports = async function (context, req) {
  try {
    if (req && req.method === "OPTIONS") {
      return safeJson(context.res || {}, 204, null, req);
    }

    const env = {
      COSMOSDB_ENDPOINT: Boolean(process.env.COSMOSDB_ENDPOINT),
      COSMOSDB_KEY: Boolean(process.env.COSMOSDB_KEY),
      COSMOSDB_DB: process.env.COSMOSDB_DB || "appdata",
      COSMOSDB_CONTAINER: process.env.COSMOSDB_CONTAINER || "items"
    };

    let cosmosStatus = "unknown";
    let cosmosError = null;
    let cosmosCode = null;
    try {
      const cfg = getCosmosConfig();
      const container = getContainer();
      const { resource } = await container.read();
      cosmosStatus = resource ? "ok" : "no-resource";
      env.COSMOSDB_DB = cfg.databaseId;
      env.COSMOSDB_CONTAINER = cfg.containerId;
    } catch (err) {
      cosmosStatus = "error";
      cosmosError = err && err.message ? String(err.message) : "Unknown error";
      cosmosCode = err && err.code ? String(err.code) : null;
    }

    return safeJson(context.res || {}, 200, { env, cosmosStatus, cosmosError, cosmosCode }, req);
  } catch (err) {
    const message = err && err.message ? String(err.message) : "Unknown error";
    const code = err && err.code ? String(err.code) : null;
    return safeJson(context.res || {}, 500, { error: "Debug failed", code, message }, req);
  }
};
