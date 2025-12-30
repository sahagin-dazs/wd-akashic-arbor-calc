const crypto = require("crypto");

function newId() {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 12);
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

function safeJson(res, status, body, req) {
  const allowedOrigins = (process.env.CORS_ORIGINS ||
    "https://wdtoolbox.com,https://www.wdtoolbox.com,http://localhost:5173,http://localhost:8080")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  const origin = req && req.headers ? req.headers.origin : null;
  const allowOrigin = origin && allowedOrigins.includes(origin) ? origin : allowedOrigins[0] || "*";

  res.status = status;
  res.headers = {
    "content-type": "application/json",
    "access-control-allow-origin": allowOrigin,
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-allow-headers": "Content-Type,x-edit-token",
    "vary": "Origin"
  };
  res.body = body === null || body === undefined ? "" : JSON.stringify(body);
  return res;
}

function parseBody(req) {
  if (!req || req.body === undefined || req.body === null) return {};
  if (typeof req.body === "object") return req.body;
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  return {};
}

module.exports = { newId, hashToken, sanitizeInput, safeJson, parseBody };
