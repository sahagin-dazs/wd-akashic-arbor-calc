const store = require("../shared/store");
const { newId, hashToken, sanitizeInput, safeJson, parseBody } = require("../shared/utils");

module.exports = async function (context, req) {
  const method = req.method || "GET";
  const route = context.bindingData.route || "";
  try {
    if (method === "POST" && !context.bindingData.id) {
      return await createItem(req, context);
    }
    if (method === "GET" && context.bindingData.id) {
      return await getItem(req, context);
    }
    if (method === "POST" && context.bindingData.id) {
      return await updateItem(req, context);
    }
    return safeJson({}, 405, { error: "Method not allowed" });
  } catch (err) {
    context.log.error("items handler error", err);
    const message = err && err.message ? String(err.message) : "";
    if (message.includes("COSMOSDB_ENDPOINT") || message.includes("COSMOSDB_KEY")) {
      return safeJson({}, 500, { error: message });
    }
    return safeJson({}, 500, { error: "Internal server error" });
  }
};

async function createItem(req, context) {
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

  return safeJson({}, 201, {
    id: doc.id,
    title: doc.title,
    data: doc.data,
    voteTally: doc.voteTally,
    comments: doc.comments,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    editToken
  });
}

async function getItem(req, context) {
  const id = context.bindingData.id;
  try {
    const resource = await store.read(id);
    if (!resource) return safeJson({}, 404, { error: "Not found" });
    const { editSecretHash, ...rest } = resource;
    return safeJson({}, 200, rest);
  } catch (err) {
    if (err.code === 404) return safeJson({}, 404, { error: "Not found" });
    throw err;
  }
}

async function updateItem(req, context) {
  const id = context.bindingData.id;
  const body = parseBody(req);
  const providedToken =
    sanitizeInput(req.headers["x-edit-token"]) || sanitizeInput(body.editToken);

  if (!providedToken) {
    return safeJson({}, 401, { error: "Missing edit token" });
  }

  let resource;
  try {
    resource = await store.read(id);
    if (!resource) return safeJson({}, 404, { error: "Not found" });
  } catch (err) {
    if (err.code === 404) return safeJson({}, 404, { error: "Not found" });
    throw err;
  }

  const hashed = hashToken(providedToken);
  if (hashed !== resource.editSecretHash) {
    return safeJson({}, 403, { error: "Invalid edit token" });
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
  return safeJson({}, 200, rest);
}
