const service = require("./tutors.service");
const memberships = require("./memberships.service");
const response = require("../../utils/apiResponse");
const asyncHandler = require("../../shared/http/asyncHandler");

const getAll = asyncHandler(async (req, res) => {
  const result = await service.getAll(req.validatedQuery, req.tenant);
  return response.ok(res, result);
});

const getOne = asyncHandler(async (req, res) => {
  const result = await service.getOne(req.params.id, req.tenant);
  return response.ok(res, result);
});

const updateProfile = asyncHandler(async (req, res) => {
  const result = await service.updateProfile(req.user.id, req.body);
  return response.ok(res, result, "Perfil actualizado");
});

const addSubject = asyncHandler(async (req, res) => {
  const result = await service.addSubject(req.user.id, req.body, req.tenant);
  return response.created(res, result, "Materia agregada");
});

const removeSubject = asyncHandler(async (req, res) => {
  await service.removeSubject(req.user.id, req.params.subjectId);
  return response.ok(res, null, "Materia eliminada");
});

const getAvailability = asyncHandler(async (req, res) => {
  const result = await service.getAvailability(req.params.id, req.tenant);
  return response.ok(res, result);
});

const setAvailability = asyncHandler(async (req, res) => {
  const result = await service.setAvailability(req.user.id, req.body.slots);
  return response.ok(res, result, "Disponibilidad actualizada");
});

const getBookedSlots = asyncHandler(async (req, res) => {
  const result = await service.getBookedSlots(
    req.params.id,
    req.validatedQuery.date,
    req.tenant,
  );
  return response.ok(res, result);
});

const listForVerification = asyncHandler(async (req, res) =>
  response.ok(
    res,
    await memberships.listForInstitution(req.tenant, req.validatedQuery),
  ),
);

const reviewMembership = asyncHandler(async (req, res) =>
  response.ok(
    res,
    await memberships.review(req.tenant, req.params.id, req.body),
    req.body.status === "verified" ? "Tutor verificado" : "Solicitud rechazada",
  ),
);

const inviteTutor = asyncHandler(async (req, res) =>
  response.created(
    res,
    await memberships.invite(req.tenant, req.body),
    "Invitación enviada al tutor",
  ),
);

const listMyMemberships = asyncHandler(async (req, res) =>
  response.ok(res, await memberships.listMine(req.user.id)),
);

const listJoinable = asyncHandler(async (req, res) =>
  response.ok(res, await memberships.joinable(req.user.id)),
);

const requestMembership = asyncHandler(async (req, res) =>
  response.created(
    res,
    await memberships.request(req.user.id, req.body.institutionId),
    "Solicitud enviada",
  ),
);

const respondToMembership = asyncHandler(async (req, res) =>
  response.ok(
    res,
    await memberships.respond(req.user.id, req.params.id, req.body.accept),
    req.body.accept ? "Invitación aceptada" : "Invitación rechazada",
  ),
);

module.exports = {
  getAll,
  getOne,
  updateProfile,
  addSubject,
  removeSubject,
  getAvailability,
  setAvailability,
  getBookedSlots,
  listForVerification,
  reviewMembership,
  inviteTutor,
  listMyMemberships,
  listJoinable,
  requestMembership,
  respondToMembership,
};
