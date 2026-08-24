import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import request from "supertest";
import { createRequire } from "module";

import app from "../../src/app.js";
import dbHelpers from "../helpers/db.js";
import factories from "../helpers/factories.js";

const require = createRequire(import.meta.url);
const dns = require("dns").promises;

const { prisma, resetDatabase } = dbHelpers;
const { createInstitution, createUser, createPlatformWallet, authHeader } =
  factories;

let institution;
let coordinator;
let admin;

const addDomain = (domain, actor = coordinator) =>
  request(app)
    .post("/api/institutions/domains")
    .set(authHeader(actor))
    .send({ domain });

const tokenOf = (id) =>
  prisma.institutionDomain
    .findUnique({ where: { id } })
    .then((domain) => domain.verificationToken);

beforeEach(async () => {
  await resetDatabase();
  await createPlatformWallet();

  institution = await createInstitution({ type: "university" });
  coordinator = await createUser({
    role: "institution_admin",
    institutionId: institution.id,
  });
  admin = await createUser({ role: "platform_admin" });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("alta de dominios", () => {
  it("añade un dominio sin verificar y sin exponer el token", async () => {
    const res = await addDomain("alumnos.macaw.edu");

    expect(res.status).toBe(201);
    expect(res.body.data.verifiedAt).toBeNull();
    expect(res.body.data.verificationToken).toBeUndefined();

    expect(await tokenOf(res.body.data.id)).toHaveLength(32);
  });

  it("no expone el token en el listado", async () => {
    await addDomain("alumnos.macaw.edu");

    const res = await request(app)
      .get("/api/institutions/domains")
      .set(authHeader(coordinator));

    expect(res.status).toBe(200);
    expect(res.body.data.every((d) => d.verificationToken === undefined)).toBe(true);
  });

  it("no deja reclamar un dominio ya registrado por otra institución", async () => {
    const other = await createInstitution({});

    const res = await addDomain(other.domain);

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("INSTITUTION_DOMAIN_TAKEN");
  });

  it("no deja tocar el dominio de otra institución", async () => {
    const other = await createInstitution({});
    const foreign = await prisma.institutionDomain.findFirst({
      where: { institutionId: other.id },
    });

    const res = await request(app)
      .delete(`/api/institutions/domains/${foreign.id}`)
      .set(authHeader(coordinator));

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("DOMAIN_NOT_FOUND");
  });
});

describe("verificación por DNS", () => {
  it("entrega el registro TXT que hay que publicar", async () => {
    const added = await addDomain("alumnos.macaw.edu");

    const res = await request(app)
      .post(`/api/institutions/domains/${added.body.data.id}/verification`)
      .set(authHeader(coordinator))
      .send({ method: "dns" });

    expect(res.status).toBe(200);
    expect(res.body.data.recordType).toBe("TXT");
    expect(res.body.data.recordValue).toBe(
      `macaw-verification=${await tokenOf(added.body.data.id)}`,
    );
  });

  it("verifica cuando el registro TXT está publicado", async () => {
    const added = await addDomain("alumnos.macaw.edu");

    await request(app)
      .post(`/api/institutions/domains/${added.body.data.id}/verification`)
      .set(authHeader(coordinator))
      .send({ method: "dns" });

    const token = await tokenOf(added.body.data.id);

    vi.spyOn(dns, "resolveTxt").mockResolvedValue([
      ["v=spf1 include:_spf.google.com ~all"],
      ["macaw-verification=", token],
    ]);

    const res = await request(app)
      .post(`/api/institutions/domains/${added.body.data.id}/verify`)
      .set(authHeader(coordinator))
      .send({ method: "dns" });

    expect(res.status).toBe(200);
    expect(res.body.data.verifiedAt).not.toBeNull();
    expect(res.body.data.verificationMethod).toBe("dns");
    expect(await tokenOf(added.body.data.id)).toBeNull();
  });

  it("falla cuando el registro no está", async () => {
    const added = await addDomain("alumnos.macaw.edu");

    await request(app)
      .post(`/api/institutions/domains/${added.body.data.id}/verification`)
      .set(authHeader(coordinator))
      .send({ method: "dns" });

    vi.spyOn(dns, "resolveTxt").mockResolvedValue([["otra-cosa"]]);

    const res = await request(app)
      .post(`/api/institutions/domains/${added.body.data.id}/verify`)
      .set(authHeader(coordinator))
      .send({ method: "dns" });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("DOMAIN_VERIFICATION_FAILED");
  });

  it("falla sin dejar rastro cuando el dominio no resuelve", async () => {
    const added = await addDomain("alumnos.macaw.edu");

    await request(app)
      .post(`/api/institutions/domains/${added.body.data.id}/verification`)
      .set(authHeader(coordinator))
      .send({ method: "dns" });

    vi.spyOn(dns, "resolveTxt").mockRejectedValue(new Error("ENOTFOUND"));

    const res = await request(app)
      .post(`/api/institutions/domains/${added.body.data.id}/verify`)
      .set(authHeader(coordinator))
      .send({ method: "dns" });

    expect(res.status).toBe(400);

    const saved = await prisma.institutionDomain.findUnique({
      where: { id: added.body.data.id },
    });
    expect(saved.verifiedAt).toBeNull();
  });
});

describe("verificación por correo", () => {
  it("encola el correo a postmaster con el token", async () => {
    const added = await addDomain("alumnos.macaw.edu");

    const res = await request(app)
      .post(`/api/institutions/domains/${added.body.data.id}/verification`)
      .set(authHeader(coordinator))
      .send({ method: "email" });

    expect(res.status).toBe(200);
    expect(res.body.data.sentTo).toBe("postmaster@alumnos.macaw.edu");

    const event = await prisma.outboxEvent.findFirst({
      where: { type: "domain_verification" },
    });

    expect(event.payload.email).toBe("postmaster@alumnos.macaw.edu");
    expect(event.payload.token).toBe(await tokenOf(added.body.data.id));
  });

  it("verifica con el token correcto y rechaza el incorrecto", async () => {
    const added = await addDomain("alumnos.macaw.edu");

    await request(app)
      .post(`/api/institutions/domains/${added.body.data.id}/verification`)
      .set(authHeader(coordinator))
      .send({ method: "email" });

    const wrong = await request(app)
      .post(`/api/institutions/domains/${added.body.data.id}/verify`)
      .set(authHeader(coordinator))
      .send({ method: "email", token: "no-es-el-token" });

    expect(wrong.status).toBe(400);
    expect(wrong.body.error.code).toBe("DOMAIN_VERIFICATION_FAILED");

    const token = await tokenOf(added.body.data.id);

    const right = await request(app)
      .post(`/api/institutions/domains/${added.body.data.id}/verify`)
      .set(authHeader(coordinator))
      .send({ method: "email", token });

    expect(right.status).toBe(200);
    expect(right.body.data.verificationMethod).toBe("email");
  });

  it("exige iniciar la verificación antes de comprobarla", async () => {
    const added = await addDomain("alumnos.macaw.edu");

    await prisma.institutionDomain.update({
      where: { id: added.body.data.id },
      data: { verificationToken: null },
    });

    const res = await request(app)
      .post(`/api/institutions/domains/${added.body.data.id}/verify`)
      .set(authHeader(coordinator))
      .send({ method: "email", token: "cualquiera" });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("DOMAIN_VERIFICATION_NOT_STARTED");
  });

  it("no verifica dos veces el mismo dominio", async () => {
    const verified = await prisma.institutionDomain.findFirst({
      where: { institutionId: institution.id },
    });

    const res = await request(app)
      .post(`/api/institutions/domains/${verified.id}/verify`)
      .set(authHeader(coordinator))
      .send({ method: "email", token: "cualquiera" });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("DOMAIN_ALREADY_VERIFIED");
  });
});

describe("el registro solo confía en dominios verificados", () => {
  it("no asocia al estudiante cuando el dominio no está verificado", async () => {
    await addDomain("sinverificar.macaw.edu");

    const res = await request(app).post("/api/auth/register").send({
      name: "Estudiante",
      email: "alguien@sinverificar.macaw.edu",
      password: "password123",
      role: "student",
    });

    expect(res.status).toBe(201);
    expect(res.body.data.user.institutionId).toBeNull();
  });

  it("asocia al estudiante en cuanto el dominio queda verificado", async () => {
    const added = await addDomain("verificado.macaw.edu");

    await request(app)
      .post(`/api/institutions/domains/${added.body.data.id}/verification`)
      .set(authHeader(coordinator))
      .send({ method: "email" });

    const token = await tokenOf(added.body.data.id);

    await request(app)
      .post(`/api/institutions/domains/${added.body.data.id}/verify`)
      .set(authHeader(coordinator))
      .send({ method: "email", token });

    const res = await request(app).post("/api/auth/register").send({
      name: "Estudiante",
      email: "alguien@verificado.macaw.edu",
      password: "password123",
      role: "student",
    });

    expect(res.status).toBe(201);
    expect(res.body.data.user.institutionId).toBe(institution.id);
  });
});

describe("dominio principal", () => {
  it("exige que esté verificado", async () => {
    const added = await addDomain("secundario.macaw.edu");

    const res = await request(app)
      .post(`/api/institutions/domains/${added.body.data.id}/primary`)
      .set(authHeader(coordinator));

    expect(res.status).toBe(409);
  });

  it("cambia el principal y actualiza la institución", async () => {
    const added = await addDomain("principal.macaw.edu");

    await prisma.institutionDomain.update({
      where: { id: added.body.data.id },
      data: { verifiedAt: new Date(), verificationMethod: "manual" },
    });

    const res = await request(app)
      .post(`/api/institutions/domains/${added.body.data.id}/primary`)
      .set(authHeader(coordinator));

    expect(res.status).toBe(200);

    const saved = await prisma.institution.findUnique({
      where: { id: institution.id },
      include: { domains: true },
    });

    expect(saved.domain).toBe("principal.macaw.edu");
    expect(saved.domains.filter((d) => d.isPrimary)).toHaveLength(1);
  });

  it("no elimina el dominio principal", async () => {
    const primary = await prisma.institutionDomain.findFirst({
      where: { institutionId: institution.id, isPrimary: true },
    });

    const res = await request(app)
      .delete(`/api/institutions/domains/${primary.id}`)
      .set(authHeader(coordinator));

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("DOMAIN_IS_PRIMARY");
  });

  it("elimina un dominio secundario", async () => {
    const added = await addDomain("temporal.macaw.edu");

    const res = await request(app)
      .delete(`/api/institutions/domains/${added.body.data.id}`)
      .set(authHeader(coordinator));

    expect(res.status).toBe(200);
    expect(
      await prisma.institutionDomain.findUnique({
        where: { id: added.body.data.id },
      }),
    ).toBeNull();
  });
});
