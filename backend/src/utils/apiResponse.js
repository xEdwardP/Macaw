const ok = (res, data, msg = 'Success', status = 200) =>
  res.status(status).json({ success: true, message: msg, data })

const created = (res, data, msg = 'Created') =>
  ok(res, data, msg, 201)

const error = (res, msg = 'Error', status = 400) =>
  res.status(status).json({ success: false, message: msg })

const notFound = (res, msg = 'No encontrado') =>
  error(res, msg, 404)

const unauthorized = (res, msg = 'No autorizado') =>
  error(res, msg, 401)

const forbidden = (res, msg = 'Acceso denegado') =>
  error(res, msg, 403)

module.exports = { ok, created, error, notFound, unauthorized, forbidden }