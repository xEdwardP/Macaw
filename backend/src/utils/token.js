const crypto = require("crypto");

const randomToken = (bytes = 32) => crypto.randomBytes(bytes).toString("hex");

const randomPassword = () => crypto.randomBytes(48).toString("base64url");

module.exports = { randomToken, randomPassword };
