const env = require("../../config/env");

const clientUrl = (path) =>
  `${env.CLIENT_URL || env.corsOrigins[0] || ""}${path}`;

const acceptUrl = (token) => clientUrl(`/invitation/${token}`);

module.exports = { acceptUrl, clientUrl };
