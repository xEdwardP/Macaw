const { AsyncLocalStorage } = require("node:async_hooks");
const { randomUUID } = require("node:crypto");

const storage = new AsyncLocalStorage();

const runWithRequestId = (requestId, callback) =>
  storage.run({ requestId }, callback);

const getRequestId = () => storage.getStore()?.requestId;

const requestIdMiddleware = (req, res, next) => {
  const requestId = req.headers["x-request-id"] || randomUUID();
  req.id = requestId;
  res.setHeader("x-request-id", requestId);
  runWithRequestId(requestId, next);
};

module.exports = { requestIdMiddleware, getRequestId, runWithRequestId };
