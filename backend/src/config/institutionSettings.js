const BASE_SETTINGS = {
  allowCrossInstitutionTutoring: false,
  crossInstitutionAllowList: [],
  allowCrossCurrencySessions: false,
  studentSelfTopUp: true,
  tutorWithdrawals: true,
};

const SETTINGS_BY_TYPE = {
  school: { studentSelfTopUp: false, tutorWithdrawals: false },
  college: { studentSelfTopUp: false, tutorWithdrawals: false },
};

const defaultSettingsFor = (type) => ({
  ...BASE_SETTINGS,
  ...(SETTINGS_BY_TYPE[type] || {}),
});

const resolveSettings = (institution) => ({
  ...defaultSettingsFor(institution?.type),
  ...(institution?.settings || {}),
});

const UNIT_LABELS = {
  university: { unit: "Facultad", units: "Facultades", term: "Trimestre" },
  college: { unit: "Nivel", units: "Niveles", term: "Grado" },
  school: { unit: "Nivel", units: "Niveles", term: "Grado" },
  technical: { unit: "Área", units: "Áreas", term: "Módulo" },
  academy: { unit: "Área", units: "Áreas", term: "Módulo" },
  bootcamp: { unit: "Programa", units: "Programas", term: "Módulo" },
  organization: { unit: "Departamento", units: "Departamentos", term: "Periodo" },
};

const labelsFor = (type) => UNIT_LABELS[type] || UNIT_LABELS.university;

const DEFAULT_UNIT_KIND = {
  university: "faculty",
  college: "level",
  school: "level",
  technical: "area",
  academy: "area",
  bootcamp: "program",
  organization: "department",
};

const defaultUnitKindFor = (type) => DEFAULT_UNIT_KIND[type] || "faculty";

module.exports = {
  BASE_SETTINGS,
  defaultSettingsFor,
  resolveSettings,
  labelsFor,
  defaultUnitKindFor,
};
