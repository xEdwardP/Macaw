const service = require("./users.service");
const response = require("../../utils/apiResponse");
const asyncHandler = require("../../shared/http/asyncHandler");

const getAll = asyncHandler(async (req, res) => {
  const result = await service.getAll(req.validatedQuery);
  return response.ok(res, result);
});

const createCoordinator = asyncHandler(async (req, res) => {
  const result = await service.createCoordinator(req.user.id, req.body);
  return response.created(res, result, "Coordinador creado");
});

const toggleActive = asyncHandler(async (req, res) => {
  const result = await service.toggleActive(req.params.id);
  return response.ok(res, result, "Usuario actualizado");
});

const updatePreferences = asyncHandler(async (req, res) => {
  const result = await service.updatePreferences(req.user.id, req.body);
  return response.ok(res, result, "Preferencias actualizadas");
});

const updateProfile = asyncHandler(async (req, res) => {
  const result = await service.updateProfile(req.user.id, req.body);
  return response.ok(res, result, "Perfil actualizado");
});

const uploadAvatar = asyncHandler(async (req, res) => {
  const result = await service.setAvatar(req.user.id, req.file);
  return response.ok(res, result, "Foto actualizada");
});

module.exports = {
  getAll,
  createCoordinator,
  toggleActive,
  updatePreferences,
  updateProfile,
  uploadAvatar,
};
