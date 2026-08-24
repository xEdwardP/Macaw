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
} = factories;

let a;
let b;
let admin;

const buildInstitution = async ({ balance = 1000 } = {}) => {
  const institution = await createInstitution({ balance });
  const unit = await createUnit(institution.id);
  const subject = await createSubject(institution.id, unit.id);

  const coordinator = await createUser({
    role: "institution_admin",
    institutionId: institution.id,
  });
  const student = await createUser({
    role: "student",
    institutionId: institution.id,
    academicUnitId: unit.id,
    balance: 200,
  });
  const tutor = await createTutor({
    institutionId: institution.id,
    academicUnitId: unit.id,
    subjectId: subject.id,
  });

  return { institution, unit, subject, coordinator, student, tutor };
};

beforeEach(async () => {
  await resetDatabase();
  await createPlatformWallet();

  a = await buildInstitution();
  b = await buildInstitution();
  admin = await createUser({ role: "platform_admin" });
});

describe("subsidios", () => {
  it("A no puede gastar el balance de B", async () => {
    const res = await request(app)
      .post("/api/wallet/subsidy")
      .set(authHeader(a.coordinator))
      .send({
        studentId: b.student.id,
        amount: 50,
        institutionId: b.institution.id,
      });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("INSTITUTION_MISMATCH");

    const institutionB = await prisma.institution.findUnique({
      where: { id: b.institution.id },
    });
    expect(Number(institutionB.balance)).toBe(1000);
  });

  it("A no puede subsidiar a un estudiante de B con su propio balance", async () => {
    const res = await request(app)
      .post("/api/wallet/subsidy")
      .set(authHeader(a.coordinator))
      .send({ studentId: b.student.id, amount: 50 });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("INSTITUTION_MISMATCH");
  });

  it("A sí puede subsidiar a su propio estudiante", async () => {
    const res = await request(app)
      .post("/api/wallet/subsidy")
      .set(authHeader(a.coordinator))
      .send({ studentId: a.student.id, amount: 50 });

    expect(res.status).toBe(200);

    const institutionA = await prisma.institution.findUnique({
      where: { id: a.institution.id },
    });
    expect(Number(institutionA.balance)).toBe(950);
  });
});

describe("analíticas", () => {
  it("los conteos de A no incluyen datos de B", async () => {
    const res = await request(app)
      .get("/api/institutions/analytics")
      .set(authHeader(a.coordinator));

    expect(res.status).toBe(200);
    expect(res.body.data.overview.totalStudents).toBe(1);
    expect(res.body.data.overview.totalTutors).toBe(1);
    expect(res.body.data.recentSessions).toHaveLength(0);
  });

  it("las sesiones de B no aparecen en las analíticas de A", async () => {
    await request(app)
      .post("/api/sessions")
      .set(authHeader(b.student))
      .send({
        tutorId: b.tutor.id,
        subjectId: b.subject.id,
        date: nextDateFor(1, 2),
        startTime: "10:00",
        endTime: "11:00",
      });

    const forA = await request(app)
      .get("/api/institutions/analytics")
      .set(authHeader(a.coordinator));
    const forB = await request(app)
      .get("/api/institutions/analytics")
      .set(authHeader(b.coordinator));

    expect(forA.body.data.overview.totalSessions).toBe(0);
    expect(forB.body.data.overview.totalSessions).toBe(1);
  });

  it("los subsidios de B no suman en las analíticas de A", async () => {
    await request(app)
      .post("/api/wallet/subsidy")
      .set(authHeader(b.coordinator))
      .send({ studentId: b.student.id, amount: 75 });

    const res = await request(app)
      .get("/api/institutions/analytics")
      .set(authHeader(a.coordinator));

    expect(res.body.data.overview.totalSubsidiesAmount).toBe(0);
  });
});

describe("estudiantes", () => {
  it("A solo ve a sus propios estudiantes", async () => {
    const res = await request(app)
      .get("/api/institutions/students")
      .set(authHeader(a.coordinator));

    expect(res.status).toBe(200);
    expect(res.body.data.total).toBe(1);
    expect(res.body.data.data[0].id).toBe(a.student.id);
  });
});

describe("materias y unidades académicas", () => {
  it("A no puede editar una materia de B", async () => {
    const res = await request(app)
      .put(`/api/institutions/subjects/${b.subject.id}`)
      .set(authHeader(a.coordinator))
      .send({ name: "Secuestrada" });

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("SUBJECT_NOT_FOUND");
  });

  it("A no puede borrar una materia de B", async () => {
    const res = await request(app)
      .delete(`/api/institutions/subjects/${b.subject.id}`)
      .set(authHeader(a.coordinator));

    expect(res.status).toBe(404);

    const stillThere = await prisma.subject.findUnique({
      where: { id: b.subject.id },
    });
    expect(stillThere).not.toBeNull();
  });

  it("A no puede editar una unidad académica de B", async () => {
    const res = await request(app)
      .put(`/api/institutions/units/${b.unit.id}`)
      .set(authHeader(a.coordinator))
      .send({ name: "Secuestrada", code: "HACK" });

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("ACADEMIC_UNIT_NOT_FOUND");
  });

  it("A no puede crear una materia en una unidad de B", async () => {
    const res = await request(app)
      .post("/api/institutions/subjects")
      .set(authHeader(a.coordinator))
      .send({ name: "Colada", code: "HACK-1", unitId: b.unit.id });

    expect(res.status).toBe(404);
  });

  it("dos instituciones pueden reutilizar el mismo código de materia", async () => {
    const first = await request(app)
      .post("/api/institutions/subjects")
      .set(authHeader(a.coordinator))
      .send({ name: "Cálculo", code: "MAT-101", unitId: a.unit.id });

    const second = await request(app)
      .post("/api/institutions/subjects")
      .set(authHeader(b.coordinator))
      .send({ name: "Cálculo", code: "MAT-101", unitId: b.unit.id });

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
  });

  it("A sí puede editar su propia materia", async () => {
    const res = await request(app)
      .put(`/api/institutions/subjects/${a.subject.id}`)
      .set(authHeader(a.coordinator))
      .send({ name: "Renombrada" });

    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe("Renombrada");
  });
});

describe("tutores", () => {
  it("el estudiante de A solo ve tutores de A", async () => {
    const res = await request(app)
      .get("/api/tutors")
      .set(authHeader(a.student));

    expect(res.status).toBe(200);
    expect(res.body.data.total).toBe(1);
    expect(res.body.data.data[0].id).toBe(a.tutor.id);
  });

  it("el listado de tutores no expone el email", async () => {
    const res = await request(app)
      .get("/api/tutors")
      .set(authHeader(a.student));

    expect(res.body.data.data[0]).not.toHaveProperty("email");
  });

  it("el estudiante de A no puede abrir el perfil de un tutor de B", async () => {
    const res = await request(app)
      .get(`/api/tutors/${b.tutor.id}`)
      .set(authHeader(a.student));

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("TUTOR_NOT_VERIFIED_IN_INSTITUTION");
  });

  it("el estudiante de A no puede ver la disponibilidad de un tutor de B", async () => {
    const res = await request(app)
      .get(`/api/tutors/${b.tutor.id}/availability`)
      .set(authHeader(a.student));

    expect(res.status).toBe(403);
  });

  it("el estudiante de A no puede reservar con un tutor de B", async () => {
    const res = await request(app)
      .post("/api/sessions")
      .set(authHeader(a.student))
      .send({
        tutorId: b.tutor.id,
        subjectId: b.subject.id,
        date: nextDateFor(1, 2),
        startTime: "10:00",
        endTime: "11:00",
      });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("TUTOR_NOT_VERIFIED_IN_INSTITUTION");
  });

  it("requiere autenticación para listar tutores", async () => {
    const res = await request(app).get("/api/tutors");

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("AUTH_TOKEN_MISSING");
  });
});

describe("sesiones", () => {
  it("un estudiante no puede leer la sesión de otro", async () => {
    const booking = await request(app)
      .post("/api/sessions")
      .set(authHeader(b.student))
      .send({
        tutorId: b.tutor.id,
        subjectId: b.subject.id,
        date: nextDateFor(1, 2),
        startTime: "10:00",
        endTime: "11:00",
      });

    const res = await request(app)
      .get(`/api/sessions/${booking.body.data.id}`)
      .set(authHeader(a.student));

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("SESSION_ACCESS_DENIED");
  });

  it("el listado de sesiones solo devuelve las propias", async () => {
    await request(app)
      .post("/api/sessions")
      .set(authHeader(b.student))
      .send({
        tutorId: b.tutor.id,
        subjectId: b.subject.id,
        date: nextDateFor(1, 2),
        startTime: "10:00",
        endTime: "11:00",
      });

    const res = await request(app)
      .get("/api/sessions")
      .set(authHeader(a.student));

    expect(res.status).toBe(200);
    expect(res.body.data.total).toBe(0);
  });

  it("un coordinador solo ve las sesiones de su institución", async () => {
    await request(app)
      .post("/api/sessions")
      .set(authHeader(b.student))
      .send({
        tutorId: b.tutor.id,
        subjectId: b.subject.id,
        date: nextDateFor(1, 2),
        startTime: "10:00",
        endTime: "11:00",
      });

    const res = await request(app)
      .get("/api/sessions?limit=100")
      .set(authHeader(a.coordinator));

    expect(res.status).toBe(200);
    expect(res.body.data.total).toBe(0);
    expect(res.body.data.data).toEqual([]);
  });

  it("un coordinador sí ve las sesiones de su propia institución", async () => {
    await request(app)
      .post("/api/sessions")
      .set(authHeader(a.student))
      .send({
        tutorId: a.tutor.id,
        subjectId: a.subject.id,
        date: nextDateFor(1, 2),
        startTime: "10:00",
        endTime: "11:00",
      });

    const res = await request(app)
      .get("/api/sessions?limit=100")
      .set(authHeader(a.coordinator));

    expect(res.status).toBe(200);
    expect(res.body.data.total).toBe(1);
  });

  it("las reseñas de un tutor no se leen sin sesión iniciada", async () => {
    const res = await request(app).get(`/api/reviews/tutor/${a.tutor.id}`);
    expect(res.status).toBe(401);
  });

  it("un estudiante de B no puede leer las reseñas de un tutor de A", async () => {
    const res = await request(app)
      .get(`/api/reviews/tutor/${a.tutor.id}`)
      .set(authHeader(b.student));

    expect(res.status).toBe(403);
  });
});

describe("admin de plataforma", () => {
  it("conserva la vista global de usuarios", async () => {
    const res = await request(app).get("/api/users").set(authHeader(admin));

    expect(res.status).toBe(200);
    expect(res.body.data.total).toBeGreaterThanOrEqual(6);
  });

  it("ve las analíticas agregadas de toda la plataforma", async () => {
    const res = await request(app)
      .get("/api/institutions/analytics")
      .set(authHeader(admin));

    expect(res.status).toBe(200);
    expect(res.body.data.overview.totalStudents).toBe(2);
  });
});
