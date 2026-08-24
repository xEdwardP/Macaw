import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";

import app from "../../src/app.js";
import dbHelpers from "../helpers/db.js";
import factories from "../helpers/factories.js";

const { prisma, resetDatabase } = dbHelpers;
const {
  createInstitution,
  createUnit,
  createSubject,
  createUser,
  createTutor,
  createPlatformWallet,
  authHeader,
  nextDateFor,
  DEFAULT_PASSWORD,
} = factories;

let institution;
let unit;
let coordinator;
let student;
let admin;

beforeEach(async () => {
  await resetDatabase();
  await createPlatformWallet();

  institution = await createInstitution({
    type: "college",
    currencyCode: "HNL",
    domain: `colegio-${Date.now()}.edu.hn`,
  });
  unit = await createUnit(institution.id, { kind: "level" });

  coordinator = await createUser({
    role: "institution_admin",
    institutionId: institution.id,
  });
  student = await createUser({
    role: "student",
    institutionId: institution.id,
    balance: 100,
  });
  admin = await createUser({ role: "platform_admin" });
});

describe("catálogo de monedas y planes", () => {
  it("solo devuelve la moneda activa de la plataforma", async () => {
    const res = await request(app)
      .get("/api/institutions/currencies")
      .set(authHeader(student));

    expect(res.status).toBe(200);
    expect(res.body.data.map((currency) => currency.code)).toEqual(["USD"]);
  });

  it("devuelve los planes ordenados", async () => {
    const res = await request(app)
      .get("/api/institutions/plans")
      .set(authHeader(coordinator));

    expect(res.status).toBe(200);
    expect(res.body.data.map((p) => p.code)).toEqual([
      "starter",
      "basic",
      "pro",
      "enterprise",
    ]);
  });

  it("expone las monedas sin sesión, porque el alta pública las necesita", async () => {
    const res = await request(app).get("/api/institutions/currencies");
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it("exige autenticación para los planes", async () => {
    const res = await request(app).get("/api/institutions/plans");
    expect(res.status).toBe(401);
  });
});

describe("mi institución", () => {
  it("expone tipo, moneda, etiquetas y ajustes resueltos", async () => {
    const res = await request(app)
      .get("/api/institutions/me")
      .set(authHeader(coordinator));

    expect(res.status).toBe(200);
    expect(res.body.data.type).toBe("college");
    expect(res.body.data.currencyCode).toBe("HNL");
    expect(res.body.data.currency.symbol).toBe("L");
    expect(res.body.data.labels.unit).toBe("Nivel");
  });

  it("un colegio hereda studentSelfTopUp false por su tipo", async () => {
    const res = await request(app)
      .get("/api/institutions/me")
      .set(authHeader(coordinator));

    expect(res.body.data.settings.studentSelfTopUp).toBe(false);
    expect(res.body.data.settings.allowCrossInstitutionTutoring).toBe(false);
  });

  it("una universidad conserva studentSelfTopUp true", async () => {
    const university = await createInstitution({ type: "university" });
    const other = await createUser({
      role: "institution_admin",
      institutionId: university.id,
    });

    const res = await request(app)
      .get("/api/institutions/me")
      .set(authHeader(other));

    expect(res.body.data.settings.studentSelfTopUp).toBe(true);
  });

  it("la comisión cae al valor del entorno cuando no hay override", async () => {
    const res = await request(app)
      .get("/api/institutions/me")
      .set(authHeader(coordinator));

    expect(res.body.data.commissionRate).toBe(0.1);
  });

  it("un override de institución gana sobre el entorno", async () => {
    await prisma.institution.update({
      where: { id: institution.id },
      data: { commissionRate: 0.25 },
    });

    const res = await request(app)
      .get("/api/institutions/me")
      .set(authHeader(coordinator));

    expect(res.body.data.commissionRate).toBe(0.25);
  });
});

describe("listado público de instituciones", () => {
  it("no requiere autenticación y no expone el balance", async () => {
    const res = await request(app).get("/api/institutions/public");

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data[0]).not.toHaveProperty("balance");
    expect(res.body.data[0]).not.toHaveProperty("settings");
  });

  it("oculta las instituciones suspendidas", async () => {
    const suspended = await createInstitution({ status: "suspended" });

    const res = await request(app).get("/api/institutions/public");
    const ids = res.body.data.map((i) => i.id);

    expect(ids).not.toContain(suspended.id);
  });
});

describe("unidades académicas públicas", () => {
  it("solo devuelve las unidades de la institución pedida", async () => {
    const other = await createInstitution();
    await createUnit(other.id);

    const res = await request(app).get(
      `/api/institutions/units?institutionId=${institution.id}`,
    );

    expect(res.status).toBe(200);
    expect(res.body.data.total).toBe(1);
    expect(res.body.data.data[0].id).toBe(unit.id);
  });

  it("acepta el tipo de unidad al crearla", async () => {
    const res = await request(app)
      .post("/api/institutions/units")
      .set(authHeader(coordinator))
      .send({ name: "Educación Media", code: "MED", kind: "level" });

    expect(res.status).toBe(201);
    expect(res.body.data.kind).toBe("level");
  });

  it("usa el tipo por defecto del tipo de institución", async () => {
    const res = await request(app)
      .post("/api/institutions/units")
      .set(authHeader(coordinator))
      .send({ name: "Educación Básica", code: "BAS" });

    expect(res.status).toBe(201);
    expect(res.body.data.kind).toBe("level");
  });

  it("rechaza un código de unidad repetido dentro de la institución", async () => {
    const res = await request(app)
      .post("/api/institutions/units")
      .set(authHeader(coordinator))
      .send({ name: "Duplicada", code: unit.code });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("ACADEMIC_UNIT_CODE_TAKEN");
  });
});

describe("límite de estudiantes del plan", () => {
  it("bloquea el registro al alcanzar el máximo", async () => {
    const limited = await createInstitution({
      domain: `limitada-${Date.now()}.edu`,
      plan: { code: `cap-${Date.now()}`, maxStudents: 1 },
    });

    await createUser({ role: "student", institutionId: limited.id });

    const res = await request(app)
      .post("/api/auth/register")
      .send({
        name: "Estudiante Tardío",
        email: `tarde-${Date.now()}@${limited.domain}`,
        password: DEFAULT_PASSWORD,
        role: "student",
      });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("PLAN_STUDENT_LIMIT_REACHED");
  });

  it("no aplica el límite a los tutores", async () => {
    const limited = await createInstitution({
      domain: `soloalumnos-${Date.now()}.edu`,
      plan: { code: `cap2-${Date.now()}`, maxStudents: 1 },
    });

    await createUser({ role: "student", institutionId: limited.id });

    const res = await request(app)
      .post("/api/auth/register")
      .send({
        name: "Tutor Nuevo",
        email: `tutor-${Date.now()}@soloalumnos.edu`,
        password: DEFAULT_PASSWORD,
        role: "tutor",
        institutionId: limited.id,
      });

    expect(res.status).toBe(201);
  });

  it("un plan sin máximo no bloquea", async () => {
    const unlimited = await createInstitution({
      domain: `ilimitada-${Date.now()}.edu`,
      plan: { code: `nocap-${Date.now()}`, maxStudents: null },
    });

    const res = await request(app)
      .post("/api/auth/register")
      .send({
        name: "Estudiante Libre",
        email: `libre-${Date.now()}@ilimitada.edu`,
        password: DEFAULT_PASSWORD,
        role: "student",
        institutionId: unlimited.id,
      });

    expect(res.status).toBe(201);
  });

  it("los estudiantes inactivos no cuentan para el límite", async () => {
    const limited = await createInstitution({
      domain: `inactivos-${Date.now()}.edu`,
      plan: { code: `cap3-${Date.now()}`, maxStudents: 1 },
    });

    await createUser({
      role: "student",
      institutionId: limited.id,
      isActive: false,
    });

    const res = await request(app)
      .post("/api/auth/register")
      .send({
        name: "Estudiante Activo",
        email: `activo-${Date.now()}@inactivos.edu`,
        password: DEFAULT_PASSWORD,
        role: "student",
        institutionId: limited.id,
      });

    expect(res.status).toBe(201);
  });
});

describe("resolución de institución por dominio", () => {
  it("asigna la institución a partir del dominio del correo", async () => {
    const domain = `resolucion-${Date.now()}.edu`;
    const target = await createInstitution({ domain });

    const res = await request(app)
      .post("/api/auth/register")
      .send({
        name: "Por Dominio",
        email: `alguien@${domain}`,
        password: DEFAULT_PASSWORD,
        role: "student",
      });

    expect(res.status).toBe(201);
    expect(res.body.data.user.institutionId).toBe(target.id);
  });

  it("deja sin institución un dominio desconocido", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({
        name: "Sin Casa",
        email: `nadie-${Date.now()}@dominio-inexistente.com`,
        password: DEFAULT_PASSWORD,
        role: "student",
      });

    expect(res.status).toBe(201);
    expect(res.body.data.user.institutionId).toBeNull();
  });

  it("rechaza el registro en una institución suspendida", async () => {
    const suspended = await createInstitution({ status: "suspended" });

    const res = await request(app)
      .post("/api/auth/register")
      .send({
        name: "Bloqueado",
        email: `bloqueado-${Date.now()}@${suspended.domain}`,
        password: DEFAULT_PASSWORD,
        role: "student",
      });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("INSTITUTION_SUSPENDED");
  });

  it("ignora el institutionId del cuerpo: el dominio del correo manda", async () => {
    const target = await createInstitution();

    const res = await request(app)
      .post("/api/auth/register")
      .send({
        name: "Intruso",
        email: `intruso-${Date.now()}@correo-cualquiera.com`,
        password: DEFAULT_PASSWORD,
        role: "tutor",
        institutionId: target.id,
      });

    expect(res.status).toBe(201);
    expect(res.body.data.user.institutionId).toBeNull();
  });
});

describe("un tutor de otra institución necesita membresía verificada", () => {
  const openSettings = {
    allowCrossInstitutionTutoring: true,
    crossInstitutionAllowList: [],
    allowCrossCurrencySessions: false,
    studentSelfTopUp: true,
    tutorWithdrawals: true,
  };

  const outsider = async () => {
    const other = await createInstitution();
    const otherUnit = await createUnit(other.id);
    const otherSubject = await createSubject(other.id, otherUnit.id);
    const otherTutor = await createTutor({
      institutionId: other.id,
      subjectId: otherSubject.id,
    });

    await prisma.institution.updateMany({
      where: { id: { in: [institution.id, other.id] } },
      data: { settings: openSettings },
    });

    return { other, otherSubject, otherTutor };
  };

  it("con el cruce abierto pero sin verificar, ni se ve ni se puede reservar", async () => {
    const { otherSubject, otherTutor } = await outsider();

    const listed = await request(app)
      .get("/api/tutors")
      .set(authHeader(student));

    expect(listed.body.data.data.map((t) => t.id)).not.toContain(otherTutor.id);

    const booked = await request(app)
      .post("/api/sessions")
      .set(authHeader(student))
      .send({
        tutorId: otherTutor.id,
        subjectId: otherSubject.id,
        date: nextDateFor(1, 2),
        startTime: "10:00",
        endTime: "11:00",
      });

    expect(booked.status).toBe(403);
    expect(booked.body.error.code).toBe("TUTOR_NOT_VERIFIED_IN_INSTITUTION");
  });

  it("verificado en la institución del estudiante, ya se ve y se reserva", async () => {
    const { otherSubject, otherTutor } = await outsider();

    await prisma.tutorMembership.create({
      data: {
        tutorId: otherTutor.id,
        institutionId: institution.id,
        status: "verified",
        origin: "institution",
        reviewedAt: new Date(),
      },
    });

    const listed = await request(app)
      .get("/api/tutors")
      .set(authHeader(student));

    expect(listed.body.data.data.map((t) => t.id)).toContain(otherTutor.id);

    const booked = await request(app)
      .post("/api/sessions")
      .set(authHeader(student))
      .send({
        tutorId: otherTutor.id,
        subjectId: otherSubject.id,
        date: nextDateFor(1, 2),
        startTime: "10:00",
        endTime: "11:00",
      });

    expect(booked.status).toBe(201);
  });

  it("la sesión se contabiliza en la institución del estudiante", async () => {
    const { otherSubject, otherTutor } = await outsider();

    await prisma.tutorMembership.create({
      data: {
        tutorId: otherTutor.id,
        institutionId: institution.id,
        status: "verified",
        origin: "institution",
        reviewedAt: new Date(),
      },
    });

    const booked = await request(app)
      .post("/api/sessions")
      .set(authHeader(student))
      .send({
        tutorId: otherTutor.id,
        subjectId: otherSubject.id,
        date: nextDateFor(1, 2),
        startTime: "10:00",
        endTime: "11:00",
      });

    const session = await prisma.session.findUnique({
      where: { id: booked.body.data.id },
    });

    expect(session.institutionId).toBe(institution.id);
  });

  it("una membresía rechazada no habilita nada", async () => {
    const { otherTutor } = await outsider();

    await prisma.tutorMembership.create({
      data: {
        tutorId: otherTutor.id,
        institutionId: institution.id,
        status: "rejected",
        origin: "tutor",
      },
    });

    const res = await request(app)
      .get(`/api/tutors/${otherTutor.id}`)
      .set(authHeader(student));

    expect(res.status).toBe(403);
  });
});

describe("aislamiento del resumen de reseñas por IA", () => {
  it("no deja consultar el resumen de un tutor de otra institución", async () => {
    const other = await createInstitution();
    const otherUnit = await createUnit(other.id);
    const otherSubject = await createSubject(other.id, otherUnit.id);
    const otherTutor = await createTutor({
      institutionId: other.id,
      subjectId: otherSubject.id,
    });

    const res = await request(app)
      .get(`/api/ai/review-summary/${otherTutor.id}`)
      .set(authHeader(student));

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("TUTOR_NOT_VERIFIED_IN_INSTITUTION");
  });
});

describe("institución suspendida", () => {
  it("bloquea a sus usuarios ya registrados", async () => {
    await prisma.institution.update({
      where: { id: institution.id },
      data: { status: "suspended" },
    });

    const res = await request(app)
      .get("/api/institutions/me")
      .set(authHeader(coordinator));

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("INSTITUTION_SUSPENDED");
  });

  it("no afecta al admin de plataforma", async () => {
    await prisma.institution.update({
      where: { id: institution.id },
      data: { status: "suspended" },
    });

    const res = await request(app)
      .get("/api/institutions")
      .set(authHeader(admin));

    expect(res.status).toBe(200);
  });
});

describe("grados dentro de una unidad", () => {
  it("crea, lista y ordena los grados", async () => {
    await request(app)
      .post(`/api/institutions/units/${unit.id}/grade-levels`)
      .set(authHeader(coordinator))
      .send({ name: "Segundo", code: "G2", orderIndex: 1 });

    await request(app)
      .post(`/api/institutions/units/${unit.id}/grade-levels`)
      .set(authHeader(coordinator))
      .send({ name: "Primero", code: "G1", orderIndex: 0 });

    const res = await request(app)
      .get(`/api/institutions/units/${unit.id}/grade-levels`)
      .set(authHeader(coordinator));

    expect(res.status).toBe(200);
    expect(res.body.data.map((level) => level.code)).toEqual(["G1", "G2"]);
  });

  it("no admite dos grados con el mismo código en la unidad", async () => {
    await request(app)
      .post(`/api/institutions/units/${unit.id}/grade-levels`)
      .set(authHeader(coordinator))
      .send({ name: "Primero", code: "G1" });

    const res = await request(app)
      .post(`/api/institutions/units/${unit.id}/grade-levels`)
      .set(authHeader(coordinator))
      .send({ name: "Repetido", code: "G1" });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("GRADE_LEVEL_CODE_TAKEN");
  });

  it("renombra un grado", async () => {
    const created = await request(app)
      .post(`/api/institutions/units/${unit.id}/grade-levels`)
      .set(authHeader(coordinator))
      .send({ name: "Primero", code: "G1" });

    const res = await request(app)
      .put(`/api/institutions/grade-levels/${created.body.data.id}`)
      .set(authHeader(coordinator))
      .send({ name: "Primer grado" });

    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe("Primer grado");
  });

  it("no elimina un grado con estudiantes asignados", async () => {
    const created = await request(app)
      .post(`/api/institutions/units/${unit.id}/grade-levels`)
      .set(authHeader(coordinator))
      .send({ name: "Primero", code: "G1" });

    await prisma.user.update({
      where: { id: student.id },
      data: { gradeLevelId: created.body.data.id },
    });

    const res = await request(app)
      .delete(`/api/institutions/grade-levels/${created.body.data.id}`)
      .set(authHeader(coordinator));

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("GRADE_LEVEL_HAS_STUDENTS");
  });

  it("no deja tocar los grados de otra institución", async () => {
    const other = await createInstitution({});
    const otherUnit = await createUnit(other.id);
    const level = await prisma.gradeLevel.create({
      data: { academicUnitId: otherUnit.id, name: "Ajeno", code: "GX" },
    });

    const res = await request(app)
      .put(`/api/institutions/grade-levels/${level.id}`)
      .set(authHeader(coordinator))
      .send({ name: "Intento" });

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("GRADE_LEVEL_NOT_FOUND");
  });
});
