const { safeJson } = require("../shared/utils");

module.exports = async function (context, req) {
  if (req && req.method === "OPTIONS") {
    return safeJson(context.res || {}, 204, null, req);
  }
  return safeJson(context.res || {}, 200, {
    status: "ok",
    time: new Date().toISOString()
  }, req);
};
