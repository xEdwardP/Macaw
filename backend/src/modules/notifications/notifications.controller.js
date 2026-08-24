const service = require("./notifications.service");
const response = require("../../utils/apiResponse");
const asyncHandler = require("../../shared/http/asyncHandler");

const list = asyncHandler(async (req, res) =>
  response.ok(res, await service.list(req.user.id, req.validatedQuery)),
);

const markRead = asyncHandler(async (req, res) =>
  response.ok(res, await service.markRead(req.user.id, req.params.id)),
);

const markAllRead = asyncHandler(async (req, res) =>
  response.ok(res, await service.markAllRead(req.user.id), "Todo leído"),
);

module.exports = { list, markRead, markAllRead };
