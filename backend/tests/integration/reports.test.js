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
  authHeader,
} = factories;

const rows = (csv) => csv.trim().split("\r\n");

let institution;
let coordinator;
let student;

beforeEach(async () => {
  await resetDatabase();

  institution = await createInstitution({ domain: "reportes-test.edu" });
  coordinator = await createUser({
    role: "institution_admin",
    institutionId: institution.id,
  });
  student = await createUser({
    institutionId: institution.id,
    name: "Estudiante, con coma",
    program: "Ingeniería",
  });
});

describe("GET /api/institutions/reports/:report", () => {
  it("devuelve un CSV descargable con cabecera y filas", async () => {
    const res = await request(app)
      .get("/api/institutions/reports/students")
      .set(authHeader(coordinator));

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("text/csv");
    expect(res.headers["content-disposition"]).toContain("attachment");
    expect(res.headers["content-disposition"]).toContain(".csv");

    const lines = rows(res.text);
    expect(lines[0]).toContain("nombre");
    expect(lines).toHaveLength(2);
  });

  it("escapa las comas dentro de un valor", async () => {
    const res = await request(app)
      .get("/api/institutions/reports/students")
      .set(authHeader(coordinator));

    expect(res.text).toContain('"Estudiante, con coma"');
  });

  it("no incluye estudiantes de otra institución", async () => {
    const other = await createInstitution({ domain: "ajena-reportes.edu" });
    const outsider = await createUser({
      institutionId: other.id,
      name: "Ajeno Total",
    });

    const res = await request(app)
      .get("/api/institutions/reports/students")
      .set(authHeader(coordinator));

    expect(res.text).not.toContain(outsider.email);
    expect(res.text).toContain(student.email);
  });

  it("exporta los tutores con su estado de verificación", async () => {
    const tutor = await createTutor({ institutionId: institution.id });
    await request(app)
      .patch(`/api/tutors/${tutor.id}/verification`)
      .set(authHeader(coordinator))
      .send({ isVerified: true });

    const res = await request(app)
      .get("/api/institutions/reports/tutors")
      .set(authHeader(coordinator));

    const lines = rows(res.text);
    expect(lines[0]).toContain("verificado");
    expect(lines[1]).toContain(tutor.email);
    expect(lines[1]).toMatch(/,si,/);
  });

  it("filtra las sesiones por rango de fechas", async () => {
    const unit = await createUnit(institution.id);
    const subject = await createSubject(institution.id, unit.id);
    const tutor = await createTutor({ institutionId: institution.id });

    await prisma.session.create({
      data: {
        studentId: student.id,
        tutorId: tutor.id,
        subjectId: subject.id,
        date: new Date("2026-01-15T00:00:00.000Z"),
        startTime: "10:00",
        endTime: "11:00",
        price: 10,
        status: "completed",
      },
    });

    const inside = await request(app)
      .get("/api/institutions/reports/sessions?from=2026-01-01&to=2026-01-31")
      .set(authHeader(coordinator));
    const outside = await request(app)
      .get("/api/institutions/reports/sessions?from=2026-02-01&to=2026-02-28")
      .set(authHeader(coordinator));

    expect(rows(inside.text)).toHaveLength(2);
    expect(rows(outside.text)).toHaveLength(1);
  });

  it("rechaza un reporte que no existe", async () => {
    const res = await request(app)
      .get("/api/institutions/reports/inventado")
      .set(authHeader(coordinator));

    expect(res.status).toBe(422);
  });

  it("un estudiante no puede descargar reportes", async () => {
    const res = await request(app)
      .get("/api/institutions/reports/students")
      .set(authHeader(student));

    expect(res.status).toBe(403);
  });
});
