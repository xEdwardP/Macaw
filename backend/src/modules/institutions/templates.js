const grades = (entries) =>
  entries.map(([code, name], index) => ({ code, name, orderIndex: index }));

const TEMPLATES = [
  {
    code: "university_hn",
    name: "Universidad (Honduras)",
    description: "Facultades de una universidad hondureña con oferta general",
    appliesTo: ["university"],
    unitKind: "faculty",
    units: [
      { code: "ING", name: "Ingeniería", gradeLevels: [] },
      { code: "ECO", name: "Ciencias Económicas y Administrativas", gradeLevels: [] },
      { code: "JUR", name: "Ciencias Jurídicas", gradeLevels: [] },
      { code: "SAL", name: "Ciencias de la Salud", gradeLevels: [] },
      { code: "HUM", name: "Humanidades y Ciencias Sociales", gradeLevels: [] },
      { code: "TEC", name: "Ciencias y Tecnología", gradeLevels: [] },
    ],
  },
  {
    code: "basic_hn",
    name: "Educación básica (Honduras)",
    description: "Tres ciclos de educación básica, de primero a noveno grado",
    appliesTo: ["school"],
    unitKind: "level",
    units: [
      {
        code: "CICLO1",
        name: "Primer ciclo",
        gradeLevels: grades([
          ["G1", "Primer grado"],
          ["G2", "Segundo grado"],
          ["G3", "Tercer grado"],
        ]),
      },
      {
        code: "CICLO2",
        name: "Segundo ciclo",
        gradeLevels: grades([
          ["G4", "Cuarto grado"],
          ["G5", "Quinto grado"],
          ["G6", "Sexto grado"],
        ]),
      },
      {
        code: "CICLO3",
        name: "Tercer ciclo",
        gradeLevels: grades([
          ["G7", "Séptimo grado"],
          ["G8", "Octavo grado"],
          ["G9", "Noveno grado"],
        ]),
      },
    ],
  },
  {
    code: "media_hn",
    name: "Educación media (Honduras)",
    description: "Bachillerato en ciencias y humanidades y bachillerato técnico profesional",
    appliesTo: ["college"],
    unitKind: "level",
    units: [
      {
        code: "BCH",
        name: "Bachillerato en Ciencias y Humanidades",
        gradeLevels: grades([
          ["G10", "Décimo grado"],
          ["G11", "Undécimo grado"],
        ]),
      },
      {
        code: "BTP",
        name: "Bachillerato Técnico Profesional",
        gradeLevels: grades([
          ["G10", "Décimo grado"],
          ["G11", "Undécimo grado"],
          ["G12", "Duodécimo grado"],
        ]),
      },
    ],
  },
  {
    code: "academy",
    name: "Academia o centro de formación",
    description: "Áreas de formación sin grados escolares",
    appliesTo: ["academy", "technical", "bootcamp", "organization"],
    unitKind: "area",
    units: [
      { code: "IDIOMAS", name: "Idiomas", gradeLevels: [] },
      { code: "MAT", name: "Matemáticas", gradeLevels: [] },
      { code: "CIENCIAS", name: "Ciencias", gradeLevels: [] },
      { code: "PROG", name: "Programación", gradeLevels: [] },
      { code: "EXAM", name: "Preparación de exámenes", gradeLevels: [] },
    ],
  },
];

const listTemplates = (type) =>
  TEMPLATES.map((template) => ({
    code: template.code,
    name: template.name,
    description: template.description,
    appliesTo: template.appliesTo,
    unitKind: template.unitKind,
    recommended: type ? template.appliesTo.includes(type) : false,
    units: template.units.map((unit) => ({
      code: unit.code,
      name: unit.name,
      gradeLevels: unit.gradeLevels.length,
    })),
  }));

const findTemplate = (code) =>
  TEMPLATES.find((template) => template.code === code) || null;

module.exports = { TEMPLATES, listTemplates, findTemplate };
