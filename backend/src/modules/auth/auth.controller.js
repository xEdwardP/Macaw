const service  = require('./auth.service')
const response = require('../../utils/apiResponse')

const register = async (req, res) => {
  try {
    const result = await service.register(req.body)
    return response.created(res, result, 'Cuenta creada')
  } catch (err) {
    return response.error(res, err.message)
  }
}

const login = async (req, res) => {
  try {
    const result = await service.login(req.body)
    return response.ok(res, result, 'Sesión iniciada')
  } catch (err) {
    return response.error(res, err.message, 401)
  }
}

const profile = (req, res) => response.ok(res, req.user)

module.exports = { register, login, profile }