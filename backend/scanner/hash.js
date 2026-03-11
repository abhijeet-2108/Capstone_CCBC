const crypto = require("crypto");

function hashReport(reportObject) {
  const jsonString = JSON.stringify(reportObject);
  return "0x" + crypto.createHash("sha256").update(jsonString).digest("hex");
}

module.exports = { hashReport };