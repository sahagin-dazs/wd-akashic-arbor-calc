const { safeJson } = require("../shared/utils");

module.exports = async function (context) {
  return safeJson(context.res || {}, 200, {
    status: "ok",
    time: new Date().toISOString()
  });
};
