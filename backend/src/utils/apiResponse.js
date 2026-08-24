const { Decimal } = require("../shared/money/money");

const serialize = (value) => {
  if (value === null || value === undefined) return value;
  if (Decimal.isDecimal(value)) return value.toNumber();
  if (value instanceof Date) return value;
  if (Array.isArray(value)) return value.map(serialize);

  if (typeof value === "object" && value.constructor === Object) {
    const result = {};
    for (const [key, item] of Object.entries(value)) result[key] = serialize(item);
    return result;
  }

  return value;
};

const ok = (res, data, msg = "Success", status = 200) =>
  res.status(status).json({ success: true, message: msg, data: serialize(data) });

const created = (res, data, msg = "Created") => ok(res, data, msg, 201);

const error = (res, msg = "Error", status = 400) =>
  res.status(status).json({ success: false, message: msg });

const notFound = (res, msg = "No encontrado") => error(res, msg, 404);

const unauthorized = (res, msg = "No autorizado") => error(res, msg, 401);

const forbidden = (res, msg = "Acceso denegado") => error(res, msg, 403);

module.exports = {
  ok,
  created,
  error,
  notFound,
  unauthorized,
  forbidden,
  serialize,
};
