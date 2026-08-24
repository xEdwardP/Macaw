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
  createPlatformWallet,
  authHeader,
} = factories;

let institution;
let unit;
let coordinator;

const importCsv = (entity, csv, query = {}) =>
  request(app)
    .post(`/api/institutions/imports/${entity}`)
    .query(query)
    .set(authHeader(coordinator))
    .set("Content-Type", "text/csv")
    .send(csv);

const studentCount = () =>
  prisma.user.count({ where: { institutionId: institution.id, role: "student" } });

beforeEach(async () => {
  await resetDatabase();
  await createPlatformWallet();

  institution = await createInstitution({ type: "college", currencyCode: "HNL" });
  unit = await createUnit(institution.id, { code: "BCH", kind: "level" });
  coordinator = await createUser({
    role: "institution_admin",
    institutionId: institution.id,
  });
});

describe("importación de estudiantes", () => {
  const csv = [
    "name,email,unitCode,gradeCode,program,termNumber",
    "Ana Pérez,ana@macaw.edu,BCH,,Ciencias,1",
    '"Bonilla, Beto",beto@macaw.edu,BCH,,Ciencias,1',
  ].join("\n");

  it("la vista previa reporta el resultado sin escribir nada", async () => {
    const res = await importCsv("students", csv, { dryRun: "true" });

    expect(res.status).toBe(200);
    expect(res.body.data.dryRun).toBe(true);
    expect(res.body.data.created).toBe(2);
    expect(res.body.data.total).toBe(2);

    expect(await studentCount()).toBe(0);
    expect(await prisma.invitation.count()).toBe(0);
  });

  it("crea estudiantes, wallets e invitaciones", async () => {
    const res = await importCsv("students", csv);

    expect(res.status).toBe(200);
    expect(res.body.data.dryRun).toBe(false);
    expect(res.body.data.created).toBe(2);

    const students = await prisma.user.findMany({
      where: { institutionId: institution.id, role: "student" },
      include: { wallet: true },
    });

    expect(students).toHaveLength(2);
    expect(students.every((s) => s.wallet.currency === "HNL")).toBe(true);
    expect(students.every((s) => s.academicUnitId === unit.id)).toBe(true);
    expect(students.map((s) => s.name)).toContain("Bonilla, Beto");

    expect(
      await prisma.invitation.count({ where: { role: "student" } }),
    ).toBe(2);
  });

  it("el estudiante importado no puede entrar hasta aceptar la invitación", async () => {
    await importCsv("students", csv);

    const rejected = await request(app)
      .post("/api/auth/login")
      .send({ email: "ana@macaw.edu", password: "password123" });

    expect(rejected.status).toBe(401);

    const invitation = await prisma.invitation.findFirst({
      where: { email: "ana@macaw.edu" },
    });

    const accepted = await request(app).post("/api/auth/invitations/accept").send({
      token: invitation.token,
      name: "Ana Pérez",
      password: "password123",
    });

    expect(accepted.status).toBe(200);

    const login = await request(app)
      .post("/api/auth/login")
      .send({ email: "ana@macaw.edu", password: "password123" });

    expect(login.status).toBe(200);
    expect(login.body.data.user.institutionId).toBe(institution.id);
  });

  it("reporta el error por fila y sigue con el resto", async () => {
    const mixed = [
      "name,email,unitCode",
      "Buena,buena@macaw.edu,BCH",
      "Sin correo,,BCH",
      "Correo malo,esto-no-es-correo,BCH",
      "Unidad mala,unidad@macaw.edu,NOEXISTE",
    ].join("\n");

    const res = await importCsv("students", mixed);

    expect(res.status).toBe(200);
    expect(res.body.data.created).toBe(1);
    expect(res.body.data.failed).toBe(3);

    const failures = res.body.data.rows.filter((row) => row.status === "failed");

    expect(failures.map((row) => row.row)).toEqual([3, 4, 5]);
    expect(failures[2].code).toBe("ACADEMIC_UNIT_NOT_FOUND");
    expect(await studentCount()).toBe(1);
  });

  it("omite a quien ya existe en la institución", async () => {
    await importCsv("students", csv);

    const res = await importCsv("students", csv);

    expect(res.body.data.created).toBe(0);
    expect(res.body.data.skipped).toBe(2);
    expect(await studentCount()).toBe(2);
  });

  it("falla la fila de un correo que pertenece a otra institución", async () => {
    const other = await createInstitution({});
    const foreign = await createUser({ role: "student", institutionId: other.id });

    const res = await importCsv(
      "students",
      `name,email\nAjeno,${foreign.email}`,
    );

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("IMPORT_MALFORMED");
  });

  it("resuelve el grado dentro de la unidad indicada", async () => {
    const level = await prisma.gradeLevel.create({
      data: { academicUnitId: unit.id, name: "Décimo", code: "G10" },
    });

    const res = await importCsv(
      "students",
      "name,email,unitCode,gradeCode\nCarla,carla@macaw.edu,BCH,G10",
    );

    expect(res.body.data.created).toBe(1);

    const student = await prisma.user.findUnique({
      where: { email: "carla@macaw.edu" },
    });

    expect(student.gradeLevelId).toBe(level.id);
  });

  it("aplica el límite del plan fila por fila", async () => {
    const limited = await createInstitution({ plan: { maxStudents: 1 } });
    const director = await createUser({
      role: "institution_admin",
      institutionId: limited.id,
    });

    const res = await request(app)
      .post("/api/institutions/imports/students")
      .set(authHeader(director))
      .set("Content-Type", "text/csv")
      .send(
        [
          "name,email",
          "Primera,primera@limitada.edu",
          "Segunda,segunda@limitada.edu",
        ].join("\n"),
      );

    expect(res.status).toBe(200);
    expect(res.body.data.created).toBe(1);
    expect(res.body.data.failed).toBe(1);
    expect(res.body.data.rows[1].code).toBe("PLAN_STUDENT_LIMIT_REACHED");

    const subscription = await prisma.subscription.findUnique({
      where: { institutionId: limited.id },
    });
    expect(subscription.currentStudents).toBe(1);
  });

  it("rechaza el archivo cuando ninguna fila sirve", async () => {
    const res = await importCsv(
      "students",
      "name,email\n,\nOtra,tampoco-es-correo",
    );

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("IMPORT_MALFORMED");
    expect(await studentCount()).toBe(0);
  });

  it("exige las columnas obligatorias", async () => {
    const res = await importCsv("students", "nombre,correo\nAna,ana@macaw.edu");

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("IMPORT_MISSING_COLUMNS");
    expect(res.body.error.params.missing).toEqual(["name", "email"]);
  });

  it("rechaza un archivo sin filas de datos", async () => {
    const res = await importCsv("students", "name,email");

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("IMPORT_EMPTY");
  });
});

describe("importación de materias", () => {
  const csv = [
    "code,name,unitCode,termNumber,credits,isGeneral",
    "MAT101,Matemática I,BCH,1,4,false",
    "ESP101,Español I,BCH,1,3,false",
    "ORI100,Orientación,,1,1,true",
  ].join("\n");

  it("la vista previa no escribe materias", async () => {
    const res = await importCsv("subjects", csv, { dryRun: "true" });

    expect(res.body.data.created).toBe(3);
    expect(await prisma.subject.count()).toBe(0);
  });

  it("crea las materias y las enlaza a su unidad", async () => {
    const res = await importCsv("subjects", csv);

    expect(res.status).toBe(200);
    expect(res.body.data.created).toBe(3);

    const subjects = await prisma.subject.findMany({
      where: { institutionId: institution.id },
      include: { units: true },
    });

    expect(subjects).toHaveLength(3);

    const general = subjects.find((s) => s.code === "ORI100");
    expect(general.isGeneral).toBe(true);
    expect(general.units).toHaveLength(0);

    const math = subjects.find((s) => s.code === "MAT101");
    expect(math.credits).toBe(4);
    expect(math.units[0].academicUnitId).toBe(unit.id);
  });

  it("omite las materias cuyo código ya existe", async () => {
    await createSubject(institution.id, unit.id, { code: "MAT101" });

    const res = await importCsv("subjects", csv);

    expect(res.body.data.created).toBe(2);
    expect(res.body.data.skipped).toBe(1);
  });

  it("falla la fila cuando la unidad no existe", async () => {
    const res = await importCsv(
      "subjects",
      "code,name,unitCode\nFIS101,Física,NOEXISTE\nQUI101,Química,BCH",
    );

    expect(res.body.data.created).toBe(1);
    expect(res.body.data.failed).toBe(1);
    expect(res.body.data.rows[0].code).toBe("ACADEMIC_UNIT_NOT_FOUND");
  });
});
