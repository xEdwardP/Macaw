import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { createRequire } from "module";

import app from "../../src/app.js";
import dbHelpers from "../helpers/db.js";
import factories from "../helpers/factories.js";

const require = createRequire(import.meta.url);
const ledger = require("../../src/shared/ledger/ledger.js");
const accounts = require("../../src/shared/ledger/accounts.js");

const { prisma, resetDatabase } = dbHelpers;
const { createInstitution, createUser, createPlatformWallet, authHeader } =
  factories;

let platform;
let admin;
let coordinator;
let institution;

const creditPlatform = (amount) =>
  ledger.postEntry(prisma, {
    reason: "test.platform_commission",
    currency: "USD",
    legs: [
      {
        account: { kind: "opening_balance", currency: "USD" },
        direction: ledger.DEBIT,
        amount,
      },
      {
        account: accounts.userWallet(platform.id, "USD"),
        direction: ledger.CREDIT,
        amount,
      },
    ],
  });

beforeEach(async () => {
  await resetDatabase();
  platform = await createPlatformWallet();

  institution = await createInstitution({});
  coordinator = await createUser({
    role: "institution_admin",
    institutionId: institution.id,
  });
  admin = await createUser({ role: "platform_admin" });
});

describe("ganancias de plataforma", () => {
  it("las calcula desde el ledger", async () => {
    await creditPlatform(25);

    const res = await request(app)
      .get("/api/institutions/platform-earnings")
      .set(authHeader(admin));

    expect(res.status).toBe(200);
    expect(res.body.data.balance).toBe(25);
    expect(res.body.data.currencyCode).toBe("USD");
  });

  it("reporta el ledger aunque la proyección se desvíe", async () => {
    await creditPlatform(25);

    await prisma.wallet.update({
      where: { userId: platform.id },
      data: { balance: 999 },
    });

    const res = await request(app)
      .get("/api/institutions/platform-earnings")
      .set(authHeader(admin));

    expect(res.body.data.balance).toBe(25);
    expect(res.body.data.projectedBalance).toBe(999);
  });

  it("solo la ve el admin de plataforma", async () => {
    const res = await request(app)
      .get("/api/institutions/platform-earnings")
      .set(authHeader(coordinator));

    expect(res.status).toBe(403);
  });
});

describe("tipos de cambio", () => {
  it("registra un tipo de cambio manual", async () => {
    const res = await request(app)
      .post("/api/institutions/exchange-rates")
      .set(authHeader(admin))
      .send({ fromCurrency: "USD", toCurrency: "HNL", rate: 26.25 });

    expect(res.status).toBe(201);
    expect(res.body.data.rate).toBe(26.25);
    expect(res.body.data.source).toBe("manual");
  });

  it("rechaza un tipo de cambio entre la misma moneda", async () => {
    const res = await request(app)
      .post("/api/institutions/exchange-rates")
      .set(authHeader(admin))
      .send({ fromCurrency: "USD", toCurrency: "USD", rate: 1 });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("EXCHANGE_RATE_INVALID");
  });

  it("rechaza una moneda fuera del catálogo", async () => {
    const res = await request(app)
      .post("/api/institutions/exchange-rates")
      .set(authHeader(admin))
      .send({ fromCurrency: "USD", toCurrency: "XXX", rate: 2 });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("CURRENCY_NOT_FOUND");
  });

  it("lista el histórico más reciente primero", async () => {
    await request(app)
      .post("/api/institutions/exchange-rates")
      .set(authHeader(admin))
      .send({
        fromCurrency: "USD",
        toCurrency: "HNL",
        rate: 25,
        validFrom: new Date(Date.now() - 86400000),
      });

    await request(app)
      .post("/api/institutions/exchange-rates")
      .set(authHeader(admin))
      .send({ fromCurrency: "USD", toCurrency: "HNL", rate: 26.5 });

    const res = await request(app)
      .get("/api/institutions/exchange-rates")
      .query({ fromCurrency: "USD", toCurrency: "HNL" })
      .set(authHeader(admin));

    expect(res.status).toBe(200);
    expect(res.body.data.map((rate) => rate.rate)).toEqual([26.5, 25]);
  });

  it("no deja al admin de institución cargar tipos de cambio", async () => {
    const res = await request(app)
      .post("/api/institutions/exchange-rates")
      .set(authHeader(coordinator))
      .send({ fromCurrency: "USD", toCurrency: "HNL", rate: 26 });

    expect(res.status).toBe(403);
  });
});

describe("resolución pública por dominio", () => {
  it("resuelve la institución por el dominio del correo", async () => {
    const res = await request(app)
      .get("/api/public/institutions/resolve")
      .query({ email: `alguien@${institution.domain}` });

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(institution.id);
    expect(res.body.data.labels.unit).toBe("Facultad");
  });

  it("resuelve también un dominio secundario verificado", async () => {
    await prisma.institutionDomain.create({
      data: {
        institutionId: institution.id,
        domain: "alumnos.macaw.edu",
        verifiedAt: new Date(),
        verificationMethod: "dns",
      },
    });

    const res = await request(app)
      .get("/api/public/institutions/resolve")
      .query({ domain: "alumnos.macaw.edu" });

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(institution.id);
  });

  it("no resuelve un dominio sin verificar", async () => {
    await prisma.institutionDomain.create({
      data: { institutionId: institution.id, domain: "pendiente.macaw.edu" },
    });

    const res = await request(app)
      .get("/api/public/institutions/resolve")
      .query({ domain: "pendiente.macaw.edu" });

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("INSTITUTION_NOT_FOUND");
  });

  it("no resuelve una institución suspendida", async () => {
    await prisma.institution.update({
      where: { id: institution.id },
      data: { status: "suspended" },
    });

    const res = await request(app)
      .get("/api/public/institutions/resolve")
      .query({ domain: institution.domain });

    expect(res.status).toBe(404);
  });

  it("exige un correo o un dominio", async () => {
    const res = await request(app).get("/api/public/institutions/resolve");

    expect(res.status).toBe(422);
  });
});
