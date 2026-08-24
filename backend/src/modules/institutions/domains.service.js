const dns = require("dns").promises;
const prisma = require("../../config/prisma");
const outbox = require("../../shared/events/outbox");
const audit = require("../../shared/audit/audit");
const { randomToken } = require("../../utils/token");
const {
  BadRequestError,
  ConflictError,
  NotFoundError,
} = require("../../shared/errors/AppError");
const ERROR_CODES = require("../../shared/errors/codes");

const RECORD_PREFIX = "macaw-verification=";

const publicView = ({ verificationToken: _token, ...domain }) => domain;

const targetInstitution = (ctx, institutionId) => {
  const id = ctx.isPlatformAdmin
    ? institutionId || ctx.institutionId
    : ctx.institutionId;

  if (!id)
    throw new BadRequestError(
      ERROR_CODES.INSTITUTION_REQUIRED,
      "Indica la institución dueña del dominio",
    );

  return id;
};

const findOwned = async (ctx, id) => {
  const domain = await prisma.institutionDomain.findFirst({
    where: {
      id,
      ...(ctx.isPlatformAdmin ? {} : { institutionId: ctx.institutionId }),
    },
  });

  if (!domain)
    throw new NotFoundError(ERROR_CODES.DOMAIN_NOT_FOUND, "Dominio no encontrado");

  return domain;
};

const list = async (ctx, institutionId) => {
  const id = targetInstitution(ctx, institutionId);

  const domains = await prisma.institutionDomain.findMany({
    where: { institutionId: id },
    orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
  });

  return domains.map(publicView);
};

const add = async (ctx, { domain, institutionId }) => {
  const id = targetInstitution(ctx, institutionId);

  const taken = await prisma.institutionDomain.findUnique({ where: { domain } });

  if (taken)
    throw new ConflictError(
      ERROR_CODES.INSTITUTION_DOMAIN_TAKEN,
      `El dominio ${domain} ya está registrado`,
    );

  const created = await prisma.$transaction(async (tx) => {
    const saved = await tx.institutionDomain.create({
      data: {
        institutionId: id,
        domain,
        verificationToken: randomToken(16),
      },
    });

    await audit.record(tx, {
      institutionId: id,
      actorId: audit.actorOf(ctx),
      action: "domain.added",
      entity: "InstitutionDomain",
      entityId: saved.id,
      metadata: { domain },
    });

    return saved;
  });

  return publicView(created);
};

const assertUnverified = (domain) => {
  if (domain.verifiedAt)
    throw new ConflictError(
      ERROR_CODES.DOMAIN_ALREADY_VERIFIED,
      "Este dominio ya está verificado",
    );
};

const startVerification = async (ctx, id, method) => {
  const domain = await findOwned(ctx, id);
  assertUnverified(domain);

  const token = domain.verificationToken || randomToken(16);

  await prisma.$transaction(async (tx) => {
    await tx.institutionDomain.update({
      where: { id },
      data: { verificationToken: token },
    });

    if (method === "email")
      await outbox.publish(tx, "domain_verification", {
        domainId: id,
        domain: domain.domain,
        email: `postmaster@${domain.domain}`,
        token,
      });
  });

  return {
    method,
    domain: domain.domain,
    ...(method === "dns"
      ? { recordType: "TXT", recordName: domain.domain, recordValue: `${RECORD_PREFIX}${token}` }
      : { sentTo: `postmaster@${domain.domain}` }),
  };
};

const markVerified = async (ctx, domain, method) => {
  const updated = await prisma.$transaction(async (tx) => {
    const saved = await tx.institutionDomain.update({
      where: { id: domain.id },
      data: {
        verifiedAt: new Date(),
        verificationMethod: method,
        verificationToken: null,
      },
    });

    await audit.record(tx, {
      institutionId: domain.institutionId,
      actorId: audit.actorOf(ctx),
      action: "domain.verified",
      entity: "InstitutionDomain",
      entityId: domain.id,
      metadata: { domain: domain.domain, method },
    });

    return saved;
  });

  return publicView(updated);
};

const verifyByDns = async (domain, resolveTxt) => {
  const expected = `${RECORD_PREFIX}${domain.verificationToken}`;

  const records = await resolveTxt(domain.domain).catch(() => []);
  const flattened = records.map((chunks) => chunks.join("").trim());

  if (!flattened.includes(expected))
    throw new BadRequestError(
      ERROR_CODES.DOMAIN_VERIFICATION_FAILED,
      "No se encontró el registro TXT esperado en el dominio",
      { expected },
    );
};

const verifyByToken = (domain, token) => {
  if (!token || token !== domain.verificationToken)
    throw new BadRequestError(
      ERROR_CODES.DOMAIN_VERIFICATION_FAILED,
      "El código de verificación no coincide",
    );
};

const verify = async (ctx, id, { method, token }, resolveTxt = dns.resolveTxt) => {
  const domain = await findOwned(ctx, id);
  assertUnverified(domain);

  if (!domain.verificationToken)
    throw new BadRequestError(
      ERROR_CODES.DOMAIN_VERIFICATION_NOT_STARTED,
      "Inicia la verificación antes de comprobarla",
    );

  if (method === "dns") await verifyByDns(domain, resolveTxt);
  else verifyByToken(domain, token);

  return markVerified(ctx, domain, method);
};

const setPrimary = async (ctx, id) => {
  const domain = await findOwned(ctx, id);

  if (!domain.verifiedAt)
    throw new ConflictError(
      ERROR_CODES.DOMAIN_VERIFICATION_NOT_STARTED,
      "Solo un dominio verificado puede ser el principal",
    );

  const updated = await prisma.$transaction(async (tx) => {
    await tx.institutionDomain.updateMany({
      where: { institutionId: domain.institutionId },
      data: { isPrimary: false },
    });

    const saved = await tx.institutionDomain.update({
      where: { id },
      data: { isPrimary: true },
    });

    await tx.institution.update({
      where: { id: domain.institutionId },
      data: { domain: domain.domain },
    });

    await audit.record(tx, {
      institutionId: domain.institutionId,
      actorId: audit.actorOf(ctx),
      action: "domain.set_primary",
      entity: "InstitutionDomain",
      entityId: id,
      metadata: { domain: domain.domain },
    });

    return saved;
  });

  return publicView(updated);
};

const remove = async (ctx, id) => {
  const domain = await findOwned(ctx, id);

  if (domain.isPrimary)
    throw new ConflictError(
      ERROR_CODES.DOMAIN_IS_PRIMARY,
      "No se puede eliminar el dominio principal. Marca otro como principal primero.",
    );

  await prisma.$transaction(async (tx) => {
    await tx.institutionDomain.delete({ where: { id } });

    await audit.record(tx, {
      institutionId: domain.institutionId,
      actorId: audit.actorOf(ctx),
      action: "domain.removed",
      entity: "InstitutionDomain",
      entityId: id,
      metadata: { domain: domain.domain },
    });
  });

  return { id };
};

module.exports = {
  list,
  add,
  startVerification,
  verify,
  setPrimary,
  remove,
  RECORD_PREFIX,
};
