const { newId, hashToken, sanitizeInput, safeJson, parseBody } = require("../shared/utils");

module.exports = async function (context, req) {
  const method = req.method || "GET";
  const route = context.bindingData.route || "";
  try {
    const store = require("../shared/store");
    if (method === "OPTIONS") {
      return safeJson(context.res || {}, 204, null, req);
    }
    if (method === "POST" && !context.bindingData.id) {
      return await createItem(req, context, store);
    }
    if (method === "GET" && context.bindingData.id) {
      return await getItem(req, context, store);
    }
    if (method === "POST" && context.bindingData.id) {
      return await updateItem(req, context, store);
    }
    return safeJson(context.res || {}, 405, { error: "Method not allowed" }, req);
  } catch (err) {
    context.log.error("items handler error", err);
    const message = err && err.message ? String(err.message) : "";
    const code = err && err.code ? String(err.code) : null;
    if (message.includes("COSMOSDB_ENDPOINT") || message.includes("COSMOSDB_KEY")) {
      return safeJson(context.res || {}, 500, { error: message, code }, req);
    }
    return safeJson(context.res || {}, 500, { error: "Internal server error", code, message }, req);
  }
};

async function createItem(req, context, store) {
  const body = parseBody(req);
  const title = sanitizeInput(body.title, "Untitled");
  const payload = body.data && typeof body.data === "object" ? body.data : {};
  const editToken = newId();
  const now = new Date().toISOString();

  const doc = {
    id: newId(),
    title,
    data: payload,
    editSecretHash: hashToken(editToken),
    voteTally: 0,
    comments: [],
    createdAt: now,
    updatedAt: now
  };

  await store.create(doc);

  return safeJson(context.res || {}, 201, {
    id: doc.id,
    title: doc.title,
    data: doc.data,
    voteTally: doc.voteTally,
    comments: doc.comments,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    editToken
  }, req);
}

async function getItem(req, context, store) {
  const id = context.bindingData.id;
  try {
    const resource = await store.read(id);
    if (!resource) return safeJson(context.res || {}, 404, { error: "Not found" }, req);
    const { editSecretHash, ...rest } = resource;
    return safeJson(context.res || {}, 200, rest, req);
  } catch (err) {
    if (err.code === 404) return safeJson(context.res || {}, 404, { error: "Not found" }, req);
    throw err;
  }
}

async function updateItem(req, context, store) {
  const id = context.bindingData.id;
  const body = parseBody(req);
  const providedToken =
    sanitizeInput(req.headers["x-edit-token"]) || sanitizeInput(body.editToken);

  if (!providedToken) {
    return safeJson(context.res || {}, 401, { error: "Missing edit token" }, req);
  }

  let resource;
  try {
    resource = await store.read(id);
    if (!resource) return safeJson(context.res || {}, 404, { error: "Not found" }, req);
  } catch (err) {
    if (err.code === 404) return safeJson(context.res || {}, 404, { error: "Not found" }, req);
    throw err;
  }

  const hashed = hashToken(providedToken);
  if (hashed !== resource.editSecretHash) {
    return safeJson(context.res || {}, 403, { error: "Invalid edit token" }, req);
  }

  const now = new Date().toISOString();
  const nextDoc = {
    ...resource,
    title: sanitizeInput(body.title, resource.title),
    data: body.data && typeof body.data === "object" ? body.data : resource.data,
    updatedAt: now
  };

  await store.replace(nextDoc);
  const { editSecretHash, ...rest } = nextDoc;
  return safeJson(context.res || {}, 200, rest, req);
}
