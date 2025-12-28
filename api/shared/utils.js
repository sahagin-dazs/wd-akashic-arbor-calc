const crypto = require("crypto");
const { nanoid } = require("nanoid");

function newId() {
  return nanoid(12);
}

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function sanitizeInput(value, fallback = null) {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length ? trimmed : fallback;
  }
  return fallback;
}

function safeJson(res, status, body) {
  res.status = status;
  res.headers = { "content-type": "application/json" };
  res.body = JSON.stringify(body);
  return res;
}

function parseBody(req) {
  try {
    return req.body ? JSON.parse(req.body) : {};
  } catch {
    return {};
  }
}

module.exports = { newId, hashToken, sanitizeInput, safeJson, parseBody };
