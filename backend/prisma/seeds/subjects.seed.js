const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const GENERAL_SUBJECTS = [
  {
    name: "Matemáticas Generales",
    code: "MAT001",
    quarter: 1,
    credits: 4,
    isGeneral: true,
  },
  { name: "Español", code: "ESP001", quarter: 1, credits: 3, isGeneral: true },
  {
    name: "Inglés I",
    code: "ING001",
    quarter: 1,
    credits: 3,
    isGeneral: true,
  },
  {
    name: "Inglés II",
    code: "ING002",
    quarter: 2,
    credits: 3,
    isGeneral: true,
  },
  {
    name: "Ética Profesional",
    code: "ETI001",
    quarter: 3,
    credits: 2,
    isGeneral: true,
  },
  {
    name: "Metodología de la Investigación",
    code: "MET001",
    quarter: 2,
    credits: 3,
    isGeneral: true,
  },
];

const SUBJECTS_BY_FACULTY = {
  ARQ: [
    {
      name: "Diseño Arquitectónico I",
      code: "ARQ101",
      quarter: 1,
      credits: 5,
    },
    {
      name: "Diseño Arquitectónico II",
      code: "ARQ102",
      quarter: 2,
      credits: 5,
    },
    {
      name: "Historia de la Arquitectura",
      code: "ARQ201",
      quarter: 2,
      credits: 3,
    },
    { name: "Estructuras I", code: "ARQ301", quarter: 3, credits: 4 },
    { name: "Urbanismo", code: "ARQ401", quarter: 4, credits: 3 },
    { name: "Cálculo I", code: "MAT101", quarter: 1, credits: 4 },
  ],
  COM: [
    {
      name: "Teoría de la Comunicación",
      code: "COM101",
      quarter: 1,
      credits: 3,
    },
    { name: "Redacción Periodística", code: "COM201", quarter: 2, credits: 3 },
    { name: "Comunicación Digital", code: "COM301", quarter: 3, credits: 3 },
    { name: "Producción Audiovisual", code: "COM401", quarter: 4, credits: 4 },
    { name: "Opinión Pública", code: "COM501", quarter: 5, credits: 3 },
  ],
  DEN: [
    { name: "Anatomía Dental", code: "DEN101", quarter: 1, credits: 4 },
    { name: "Odontología Preventiva", code: "DEN201", quarter: 2, credits: 4 },
    { name: "Cirugía Oral I", code: "DEN301", quarter: 3, credits: 5 },
    { name: "Endodoncia", code: "DEN401", quarter: 4, credits: 4 },
    { name: "Ortodoncia", code: "DEN501", quarter: 5, credits: 4 },
    { name: "Bioquímica", code: "MED201", quarter: 1, credits: 4 },
  ],
  DER: [
    { name: "Derecho Civil I", code: "DER101", quarter: 1, credits: 4 },
    { name: "Derecho Civil II", code: "DER102", quarter: 2, credits: 4 },
    { name: "Derecho Penal I", code: "DER201", quarter: 2, credits: 4 },
    { name: "Derecho Constitucional", code: "DER301", quarter: 3, credits: 4 },
    { name: "Derecho Mercantil", code: "DER401", quarter: 4, credits: 3 },
    { name: "Derecho Internacional", code: "DER501", quarter: 5, credits: 3 },
  ],
  ENF: [
    { name: "Anatomía y Fisiología", code: "ENF101", quarter: 1, credits: 4 },
    { name: "Enfermería Básica", code: "ENF201", quarter: 2, credits: 4 },
    { name: "Farmacología", code: "MED401", quarter: 3, credits: 3 },
    {
      name: "Enfermería Médico-Quirúrgica",
      code: "ENF401",
      quarter: 4,
      credits: 5,
    },
    { name: "Salud Pública", code: "ENF501", quarter: 5, credits: 3 },
  ],
  GEE: [
    { name: "Administración I", code: "GEE101", quarter: 1, credits: 4 },
    { name: "Contabilidad I", code: "CON101", quarter: 1, credits: 4 },
    { name: "Contabilidad II", code: "CON102", quarter: 2, credits: 4 },
    { name: "Microeconomía", code: "ECO101", quarter: 2, credits: 4 },
    { name: "Finanzas Empresariales", code: "GEE301", quarter: 3, credits: 4 },
    {
      name: "Estadística Empresarial",
      code: "EST101",
      quarter: 2,
      credits: 3,
    },
  ],
  ICIV: [
    { name: "Cálculo I", code: "MAT101", quarter: 1, credits: 4 },
    { name: "Cálculo II", code: "MAT102", quarter: 2, credits: 4 },
    { name: "Física I", code: "FIS101", quarter: 2, credits: 4 },
    { name: "Física II", code: "FIS102", quarter: 3, credits: 4 },
    { name: "Mecánica de Materiales", code: "CIV301", quarter: 3, credits: 4 },
    { name: "Hidráulica", code: "CIV401", quarter: 4, credits: 4 },
    { name: "Diseño Estructural", code: "CIV501", quarter: 5, credits: 4 },
  ],
  ICC: [
    { name: "Programación I", code: "SIS101", quarter: 1, credits: 4 },
    { name: "Programación II", code: "SIS102", quarter: 2, credits: 4 },
    { name: "Estructuras de Datos", code: "SIS201", quarter: 3, credits: 4 },
    { name: "Base de Datos", code: "SIS301", quarter: 4, credits: 4 },
    { name: "Redes de Computadoras", code: "SIS401", quarter: 5, credits: 3 },
    { name: "Sistemas Operativos", code: "SIS402", quarter: 5, credits: 3 },
    { name: "Cálculo I", code: "MAT101", quarter: 1, credits: 4 },
    { name: "Cálculo II", code: "MAT102", quarter: 2, credits: 4 },
    { name: "Álgebra Lineal", code: "MAT201", quarter: 2, credits: 3 },
  ],
  IIND: [
    { name: "Cálculo I", code: "MAT101", quarter: 1, credits: 4 },
    { name: "Cálculo II", code: "MAT102", quarter: 2, credits: 4 },
    { name: "Física I", code: "FIS101", quarter: 2, credits: 4 },
    {
      name: "Investigación de Operaciones",
      code: "IND301",
      quarter: 3,
      credits: 4,
    },
    { name: "Gestión de Producción", code: "IND401", quarter: 4, credits: 4 },
    { name: "Control de Calidad", code: "IND501", quarter: 5, credits: 3 },
  ],
  MED: [
    { name: "Anatomía I", code: "MED101", quarter: 1, credits: 5 },
    { name: "Anatomía II", code: "MED102", quarter: 2, credits: 5 },
    { name: "Bioquímica", code: "MED201", quarter: 2, credits: 4 },
    { name: "Fisiología", code: "MED301", quarter: 3, credits: 4 },
    { name: "Farmacología", code: "MED401", quarter: 4, credits: 4 },
    { name: "Patología General", code: "MED501", quarter: 5, credits: 4 },
    { name: "Microbiología", code: "MED601", quarter: 6, credits: 4 },
  ],
  MKT: [
    {
      name: "Fundamentos de Marketing",
      code: "MKT101",
      quarter: 1,
      credits: 4,
    },
    {
      name: "Comportamiento del Consumidor",
      code: "MKT201",
      quarter: 2,
      credits: 3,
    },
    { name: "Marketing Digital", code: "MKT301", quarter: 3, credits: 3 },
    {
      name: "Investigación de Mercados",
      code: "MKT401",
      quarter: 4,
      credits: 4,
    },
    { name: "Publicidad", code: "MKT501", quarter: 5, credits: 3 },
    { name: "Contabilidad I", code: "CON101", quarter: 1, credits: 4 },
  ],
  PSI: [
    {
      name: "Introducción a la Psicología",
      code: "PSI101",
      quarter: 1,
      credits: 3,
    },
    {
      name: "Psicología del Desarrollo",
      code: "PSI201",
      quarter: 2,
      credits: 3,
    },
    { name: "Psicología Clínica", code: "PSI301", quarter: 3, credits: 4 },
    { name: "Psicología Social", code: "PSI401", quarter: 4, credits: 3 },
    { name: "Neuropsicología", code: "PSI501", quarter: 5, credits: 4 },
    { name: "Estadística Aplicada", code: "EST101", quarter: 2, credits: 3 },
  ],
};

async function seedSubjects(faculties) {
  console.log("Seeding subjects...");

  const allSubjects = {};

  // Recopilar todos los subjects únicos
  const uniqueSubjects = {};
  for (const s of GENERAL_SUBJECTS) uniqueSubjects[s.code] = s;
  for (const subjects of Object.values(SUBJECTS_BY_FACULTY)) {
    for (const s of subjects) {
      if (!uniqueSubjects[s.code]) uniqueSubjects[s.code] = s;
    }
  }

  // Crear materias
  for (const s of Object.values(uniqueSubjects)) {
    const subject = await prisma.subject.upsert({
      where: { code: s.code },
      update: {},
      create: {
        name: s.name,
        code: s.code,
        quarter: s.quarter,
        credits: s.credits,
        isGeneral: s.isGeneral || false,
      },
    });
    allSubjects[s.code] = subject;
  }

  // Relacionar materias generales con todas las facultades
  for (const s of GENERAL_SUBJECTS) {
    for (const faculty of Object.values(faculties)) {
      await prisma.facultySubject
        .upsert({
          where: {
            facultyId_subjectId: {
              facultyId: faculty.id,
              subjectId: allSubjects[s.code].id,
            },
          },
          update: {},
          create: { facultyId: faculty.id, subjectId: allSubjects[s.code].id },
        })
        .catch(() => {});
    }
  }

  // Relacionar materias específicas con sus facultades
  for (const [facultyCode, subjects] of Object.entries(SUBJECTS_BY_FACULTY)) {
    for (const s of subjects) {
      await prisma.facultySubject
        .upsert({
          where: {
            facultyId_subjectId: {
              facultyId: faculties[facultyCode].id,
              subjectId: allSubjects[s.code].id,
            },
          },
          update: {},
          create: {
            facultyId: faculties[facultyCode].id,
            subjectId: allSubjects[s.code].id,
          },
        })
        .catch(() => {});
    }
  }

  console.log(`${Object.keys(allSubjects).length} subjects seeded`);
  return allSubjects;
}

module.exports = { seedSubjects, SUBJECTS_BY_FACULTY, GENERAL_SUBJECTS };
