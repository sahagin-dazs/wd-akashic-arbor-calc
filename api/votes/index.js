const store = require("../shared/store");
const { safeJson, parseBody } = require("../shared/utils");

module.exports = async function (context, req) {
  if (req.method === "OPTIONS") {
    return safeJson({}, 204, null, req);
  }
  if (req.method !== "POST") {
    return safeJson({}, 405, { error: "Method not allowed" }, req);
  }
  const id = context.bindingData.id;
  if (!id) return safeJson({}, 400, { error: "Missing id" }, req);

  try {
    const resource = await store.read(id);
    if (!resource) return safeJson({}, 404, { error: "Not found" }, req);

    const body = parseBody(req);
    const delta = typeof body.delta === "number" && isFinite(body.delta) ? body.delta : 1;
    const nextVotes = (resource.voteTally || 0) + delta;
    const updated = { ...resource, voteTally: nextVotes, updatedAt: new Date().toISOString() };

    await store.replace(updated);
    const { editSecretHash, ...rest } = updated;
    return safeJson({}, 200, rest, req);
  } catch (err) {
    if (err.code === 404) return safeJson({}, 404, { error: "Not found" }, req);
    context.log.error("vote error", err);
    return safeJson({}, 500, { error: "Internal server error" }, req);
  }
};
