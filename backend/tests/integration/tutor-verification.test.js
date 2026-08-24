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

let institution;
let coordinator;
let tutor;
let pending;
let unit;
let algebra;
let history;

beforeEach(async () => {
  await resetDatabase();

  institution = await createInstitution({ domain: "verif-test.edu" });
  unit = await createUnit(institution.id);
  algebra = await createSubject(institution.id, unit.id, { name: "Álgebra Lineal", code: "MAT201" });
  history = await createSubject(institution.id, unit.id, { name: "Historia", code: "HIS101" });

  coordinator = await createUser({
    role: "institution_admin",
    institutionId: institution.id,
  });

  tutor = await createTutor({
    institutionId: institution.id,
    academicUnitId: unit.id,
    subjectId: algebra.id,
  });

  pending = await createTutor({
    institutionId: institution.id,
    membershipStatus: "pending",
  });
});

describe("PATCH /api/tutors/verification/:id", () => {
  const membershipOf = (tutorId, institutionId) =>
    prisma.tutorMembership.findUnique({
      where: { tutorId_institutionId: { tutorId, institutionId } },
    });

  it("aprueba la solicitud y deja rastro de quién lo hizo", async () => {
    const membership = await membershipOf(pending.id, institution.id);

    const res = await request(app)
      .patch(`/api/tutors/verification/${membership.id}`)
      .set(authHeader(coordinator))
      .send({ status: "verified", note: "Constancia recibida" });

    expect(res.status).toBe(200);

    const saved = await membershipOf(pending.id, institution.id);
    expect(saved.status).toBe("verified");
    expect(saved.reviewedAt).not.toBeNull();
    expect(saved.reviewedById).toBe(coordinator.id);
    expect(saved.note).toBe("Constancia recibida");
  });

  it("crea la notificación y el evento de correo la primera vez", async () => {
    const membership = await membershipOf(pending.id, institution.id);

    await request(app)
      .patch(`/api/tutors/verification/${membership.id}`)
      .set(authHeader(coordinator))
      .send({ status: "verified" });

    const notification = await prisma.notification.findFirst({
      where: { userId: pending.id, type: "tutor_verified" },
    });
    expect(notification).not.toBeNull();

    const event = await prisma.outboxEvent.findFirst({
      where: { type: "tutor_verified" },
    });
    expect(event.payload.email).toBe(pending.email);
  });

  it("no duplica la notificación al aprobar dos veces", async () => {
    const membership = await membershipOf(pending.id, institution.id);

    for (let attempt = 0; attempt < 2; attempt += 1)
      await request(app)
        .patch(`/api/tutors/verification/${membership.id}`)
        .set(authHeader(coordinator))
        .send({ status: "verified" });

    expect(
      await prisma.notification.count({ where: { type: "tutor_verified" } }),
    ).toBe(1);
  });

  it("rechazar deja al tutor fuera de la institución", async () => {
    const membership = await membershipOf(tutor.id, institution.id);

    await request(app)
      .patch(`/api/tutors/verification/${membership.id}`)
      .set(authHeader(coordinator))
      .send({ status: "rejected", note: "No acreditó" });

    const saved = await membershipOf(tutor.id, institution.id);
    expect(saved.status).toBe("rejected");
    expect(saved.note).toBe("No acreditó");
  });

  it("un coordinador no puede revisar solicitudes de otra institución", async () => {
    const other = await createInstitution({ domain: "ajena-verif.edu" });
    const outsider = await createTutor({ institutionId: other.id });
    const membership = await membershipOf(outsider.id, other.id);

    const res = await request(app)
      .patch(`/api/tutors/verification/${membership.id}`)
      .set(authHeader(coordinator))
      .send({ status: "verified" });

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("TUTOR_MEMBERSHIP_NOT_FOUND");
  });

  it("un estudiante no puede verificar a nadie", async () => {
    const student = await createUser({ institutionId: institution.id });
    const membership = await membershipOf(pending.id, institution.id);

    const res = await request(app)
      .patch(`/api/tutors/verification/${membership.id}`)
      .set(authHeader(student))
      .send({ status: "verified" });

    expect(res.status).toBe(403);
  });
});

describe("GET /api/tutors/verification", () => {
  it("lista solo las solicitudes de la institución del coordinador", async () => {
    const other = await createInstitution({ domain: "ajena-lista.edu" });
    await createTutor({ institutionId: other.id });

    const res = await request(app)
      .get("/api/tutors/verification")
      .set(authHeader(coordinator));

    expect(res.status).toBe(200);
    expect(res.body.data.total).toBe(2);
    expect(res.body.data.data.map((row) => row.tutor.id).sort()).toEqual(
      [tutor.id, pending.id].sort(),
    );
  });

  it("filtra por pendientes y verificados", async () => {
    const pendientes = await request(app)
      .get("/api/tutors/verification?status=pending")
      .set(authHeader(coordinator));
    const verificados = await request(app)
      .get("/api/tutors/verification?status=verified")
      .set(authHeader(coordinator));

    expect(pendientes.body.data.total).toBe(1);
    expect(pendientes.body.data.data[0].tutor.id).toBe(pending.id);
    expect(verificados.body.data.total).toBe(1);
    expect(verificados.body.data.data[0].tutor.id).toBe(tutor.id);
  });
});

describe("GET /api/tutors con filtros nuevos", () => {
  it("filtra por materia", async () => {
    const historian = await createTutor({
      institutionId: institution.id,
      subjectId: history.id,
    });

    const res = await request(app)
      .get(`/api/tutors?subjectId=${algebra.id}`)
      .set(authHeader(coordinator));

    const ids = res.body.data.data.map((row) => row.id);
    expect(ids).toContain(tutor.id);
    expect(ids).not.toContain(historian.id);
  });

  it("encuentra por nombre de materia en la búsqueda de texto", async () => {
    const res = await request(app)
      .get("/api/tutors?search=Álgebra")
      .set(authHeader(coordinator));

    expect(res.body.data.data.map((row) => row.id)).toContain(tutor.id);
  });

  it("encuentra por código de materia", async () => {
    const res = await request(app)
      .get("/api/tutors?search=MAT201")
      .set(authHeader(coordinator));

    expect(res.body.data.data.map((row) => row.id)).toContain(tutor.id);
  });

  it("no lista tutores sin verificar", async () => {
    const res = await request(app)
      .get("/api/tutors")
      .set(authHeader(coordinator));

    const ids = res.body.data.data.map((row) => row.id);
    expect(ids).toContain(tutor.id);
    expect(ids).not.toContain(pending.id);
  });

  it("combina materia y unidad como AND, no como OR", async () => {
    const otherUnit = await createUnit(institution.id);
    const otherSubject = await createSubject(institution.id, otherUnit.id);
    const mixed = await createTutor({
      institutionId: institution.id,
      subjectId: otherSubject.id,
    });

    const res = await request(app)
      .get(`/api/tutors?subjectId=${algebra.id}&unitId=${otherUnit.id}`)
      .set(authHeader(coordinator));

    const ids = res.body.data.data.map((row) => row.id);
    expect(ids).not.toContain(mixed.id);
    expect(ids).not.toContain(tutor.id);
  });
});

describe("membresías del tutor", () => {
  it("un tutor recién registrado queda pendiente en su institución", async () => {
    await request(app).post("/api/auth/register").send({
      name: "Tutor Nuevo",
      email: "tutor.nuevo@verif-test.edu",
      password: "password123",
      role: "tutor",
    });

    const created = await prisma.user.findUnique({
      where: { email: "tutor.nuevo@verif-test.edu" },
      include: { tutorMemberships: true },
    });

    expect(created.tutorMemberships).toHaveLength(1);
    expect(created.tutorMemberships[0].institutionId).toBe(institution.id);
    expect(created.tutorMemberships[0].status).toBe("pending");
  });

  it("el tutor ve sus membresías con el estado de cada institución", async () => {
    const res = await request(app)
      .get("/api/tutors/memberships")
      .set(authHeader(tutor));

    expect(res.status).toBe(200);
    expect(res.body.data.data).toHaveLength(1);
    expect(res.body.data.data[0].status).toBe("verified");
    expect(res.body.data.data[0].institution.id).toBe(institution.id);
  });

  it("el tutor solicita otra institución y queda pendiente allí", async () => {
    const other = await createInstitution({ domain: "segunda-inst.edu" });

    const res = await request(app)
      .post("/api/tutors/memberships")
      .set(authHeader(tutor))
      .send({ institutionId: other.id });

    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe("pending");

    const saved = await prisma.tutorMembership.findUnique({
      where: {
        tutorId_institutionId: { tutorId: tutor.id, institutionId: other.id },
      },
    });
    expect(saved.origin).toBe("tutor");
  });

  it("no deja pedir dos veces la misma institución", async () => {
    const other = await createInstitution({ domain: "repetida-inst.edu" });

    await request(app)
      .post("/api/tutors/memberships")
      .set(authHeader(tutor))
      .send({ institutionId: other.id });

    const res = await request(app)
      .post("/api/tutors/memberships")
      .set(authHeader(tutor))
      .send({ institutionId: other.id });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("TUTOR_MEMBERSHIP_EXISTS");
  });

  it("las instituciones solicitables excluyen las que ya tiene", async () => {
    await createInstitution({ domain: "libre-inst.edu" });

    const res = await request(app)
      .get("/api/tutors/memberships/joinable")
      .set(authHeader(tutor));

    const ids = res.body.data.data.map((row) => row.id);
    expect(ids).not.toContain(institution.id);
    expect(ids.length).toBeGreaterThan(0);
  });

  it("el coordinador invita a un tutor que ya existe y este acepta", async () => {
    const other = await createInstitution({ domain: "invitante.edu" });
    const otherCoordinator = await createUser({
      role: "institution_admin",
      institutionId: other.id,
    });

    const invited = await request(app)
      .post("/api/tutors/verification/invite")
      .set(authHeader(otherCoordinator))
      .send({ email: tutor.email });

    expect(invited.status).toBe(201);
    expect(invited.body.data.status).toBe("pending");
    expect(invited.body.data.origin).toBe("institution");

    const notification = await prisma.notification.findFirst({
      where: { userId: tutor.id, type: "tutor_membership_invited" },
    });
    expect(notification).not.toBeNull();

    const accepted = await request(app)
      .post(`/api/tutors/memberships/${invited.body.data.id}/respond`)
      .set(authHeader(tutor))
      .send({ accept: true });

    expect(accepted.status).toBe(200);
    expect(accepted.body.data.status).toBe("verified");
  });

  it("invitar a un correo que no es de un tutor falla", async () => {
    const student = await createUser({ institutionId: institution.id });

    const res = await request(app)
      .post("/api/tutors/verification/invite")
      .set(authHeader(coordinator))
      .send({ email: student.email });

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("TUTOR_NOT_FOUND");
  });

  it("el tutor puede rechazar la invitación", async () => {
    const other = await createInstitution({ domain: "rechazada-inst.edu" });
    const otherCoordinator = await createUser({
      role: "institution_admin",
      institutionId: other.id,
    });

    const invited = await request(app)
      .post("/api/tutors/verification/invite")
      .set(authHeader(otherCoordinator))
      .send({ email: tutor.email });

    const res = await request(app)
      .post(`/api/tutors/memberships/${invited.body.data.id}/respond`)
      .set(authHeader(tutor))
      .send({ accept: false });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("rejected");
  });

  it("un tutor no puede responder la solicitud de otro", async () => {
    const otro = await createTutor({ institutionId: institution.id });
    const membership = await prisma.tutorMembership.findFirst({
      where: { tutorId: otro.id },
    });

    const res = await request(app)
      .post(`/api/tutors/memberships/${membership.id}/respond`)
      .set(authHeader(tutor))
      .send({ accept: true });

    expect(res.status).toBe(404);
  });

  it("verificado en dos instituciones, aparece en las búsquedas de ambas", async () => {
    const other = await createInstitution({ domain: "dos-inst.edu" });
    const otherStudent = await createUser({ institutionId: other.id });

    await prisma.tutorMembership.create({
      data: {
        tutorId: tutor.id,
        institutionId: other.id,
        status: "verified",
        origin: "institution",
        reviewedAt: new Date(),
      },
    });

    const enPrimera = await request(app)
      .get("/api/tutors")
      .set(authHeader(coordinator));
    const enSegunda = await request(app)
      .get("/api/tutors")
      .set(authHeader(otherStudent));

    expect(enPrimera.body.data.data.map((row) => row.id)).toContain(tutor.id);
    expect(enSegunda.body.data.data.map((row) => row.id)).toContain(tutor.id);
  });
});
