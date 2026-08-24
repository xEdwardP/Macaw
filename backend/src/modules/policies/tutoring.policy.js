const { resolveSettings } = require("../../config/institutionSettings");
const { ForbiddenError } = require("../../shared/errors/AppError");
const ERROR_CODES = require("../../shared/errors/codes");

const allowsPartner = (settings, partnerId) => {
  if (!settings.allowCrossInstitutionTutoring) return false;
  const allowList = settings.crossInstitutionAllowList;
  if (!Array.isArray(allowList) || allowList.length === 0) return true;
  return allowList.includes(partnerId);
};

const evaluate = (studentInstitution, tutorInstitution) => {
  if (!studentInstitution || !tutorInstitution)
    return { allowed: false, code: ERROR_CODES.INSTITUTION_REQUIRED };

  if (studentInstitution.id === tutorInstitution.id) return { allowed: true };

  const studentSettings = resolveSettings(studentInstitution);
  const tutorSettings = resolveSettings(tutorInstitution);

  if (
    !allowsPartner(studentSettings, tutorInstitution.id) ||
    !allowsPartner(tutorSettings, studentInstitution.id)
  )
    return { allowed: false, code: ERROR_CODES.CROSS_INSTITUTION_NOT_ALLOWED };

  if (studentInstitution.currencyCode !== tutorInstitution.currencyCode) {
    if (
      !studentSettings.allowCrossCurrencySessions ||
      !tutorSettings.allowCrossCurrencySessions
    )
      return { allowed: false, code: ERROR_CODES.CROSS_CURRENCY_NOT_ALLOWED };
  }

  return { allowed: true };
};

const MESSAGES = {
  [ERROR_CODES.INSTITUTION_REQUIRED]:
    "Necesitas pertenecer a una institución para reservar tutorías",
  [ERROR_CODES.CROSS_INSTITUTION_NOT_ALLOWED]:
    "Este tutor pertenece a otra institución",
  [ERROR_CODES.CROSS_CURRENCY_NOT_ALLOWED]:
    "Este tutor cobra en otra moneda y tu institución no permite sesiones entre monedas distintas",
};

const assertCanBook = (studentInstitution, tutorInstitution) => {
  const result = evaluate(studentInstitution, tutorInstitution);
  if (result.allowed) return;
  throw new ForbiddenError(result.code, MESSAGES[result.code]);
};

const visibleInstitutionIds = (studentInstitution, institutions) =>
  institutions
    .filter((candidate) => evaluate(studentInstitution, candidate).allowed)
    .map((candidate) => candidate.id);

module.exports = { evaluate, assertCanBook, visibleInstitutionIds };
