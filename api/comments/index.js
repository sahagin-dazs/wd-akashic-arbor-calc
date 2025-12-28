const store = require("../shared/store");
const { newId, sanitizeInput, safeJson, parseBody } = require("../shared/utils");

module.exports = async function (context, req) {
  if (req.method !== "POST") {
    return safeJson({}, 405, { error: "Method not allowed" });
  }
  const id = context.bindingData.id;
  if (!id) return safeJson({}, 400, { error: "Missing id" });

  try {
    const resource = await store.read(id);
    if (!resource) return safeJson({}, 404, { error: "Not found" });

    const body = parseBody(req);
    const author = sanitizeInput(body.author, "anon");
    const text = sanitizeInput(body.body);
    if (!text) return safeJson({}, 400, { error: "Comment body required" });

    const comment = {
      id: newId(),
      author,
      body: text,
      createdAt: new Date().toISOString()
    };

    const comments = Array.isArray(resource.comments) ? resource.comments : [];
    const next = { ...resource, comments: [...comments, comment], updatedAt: comment.createdAt };

    await store.replace(next);
    const { editSecretHash, ...rest } = next;
    return safeJson({}, 200, rest);
  } catch (err) {
    if (err.code === 404) return safeJson({}, 404, { error: "Not found" });
    context.log.error("comment error", err);
    return safeJson({}, 500, { error: "Internal server error" });
  }
};
