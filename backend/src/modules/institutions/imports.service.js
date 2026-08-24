const { z } = require("zod");
const prisma = require("../../config/prisma");
const audit = require("../../shared/audit/audit");
const invitations = require("./invitations.service");
const subscriptions = require("./subscriptions.service");
const { toRecords } = require("../../shared/csv/parseCsv");
const { BadRequestError } = require("../../shared/errors/AppError");
const ERROR_CODES = require("../../shared/errors/codes");

const TRANSACTION_OPTIONS = { maxWait: 15000, timeout: 120000 };

class DryRunRollback extends Error {
  constructor(report) {
    super("dry run");
    this.report = report;
  }
}

const emailSchema = z.string().email().toLowerCase();

const requireInstitution = (ctx, institutionId) => {
  const id = ctx.isPlatformAdmin
    ? institutionId || ctx.institutionId
    : ctx.institutionId;

  if (!id)
    throw new BadRequestError(
      ERROR_CODES.INSTITUTION_REQUIRED,
      "Indica la institución destino de la importación",
    );

  return id;
};

const summarize = (results) => ({
  total: results.length,
  created: results.filter((row) => row.status === "created").length,
  skipped: results.filter((row) => row.status === "skipped").length,
  failed: results.filter((row) => row.status === "failed").length,
  rows: results,
});

const runImport = async (ctx, institutionId, dryRun, entity, handler) => {
  const finish = async (tx, results) => {
    const report = summarize(results);

    if (report.created === 0 && report.failed > 0 && report.skipped === 0)
      throw new BadRequestError(
        ERROR_CODES.IMPORT_MALFORMED,
        "Ninguna fila del archivo pudo importarse",
        { rows: results.slice(0, 20) },
      );

    if (dryRun) throw new DryRunRollback({ ...report, dryRun: true });

    await audit.record(tx, {
      institutionId,
      actorId: audit.actorOf(ctx),
      action: `import.${entity}`,
      entity: "Institution",
      entityId: institutionId,
      metadata: {
        total: report.total,
        created: report.created,
        skipped: report.skipped,
        failed: report.failed,
      },
    });

    return { ...report, dryRun: false };
  };

  try {
    return await prisma.$transaction(
      (tx) => handler(tx, finish),
      TRANSACTION_OPTIONS,
    );
  } catch (err) {
    if (err instanceof DryRunRollback) return err.report;
    throw err;
  }
};

const importStudents = async (ctx, csv, { dryRun = false, institutionId } = {}) => {
  const id = requireInstitution(ctx, institutionId);
  const records = toRecords(csv, ["name", "email"]);

  return runImport(ctx, id, dryRun, "students", async (tx, finish) => {
    const institution = await tx.institution.findUnique({ where: { id } });

    const subscription = await tx.subscription.findUnique({
      where: { institutionId: id },
      include: { plan: true },
    });

    const maxStudents = subscription?.plan?.maxStudents ?? null;
    let students = await subscriptions.countStudents(tx, id);

    const units = await tx.academicUnit.findMany({
      where: { institutionId: id },
      include: { gradeLevels: true },
    });

    const unitByCode = new Map(units.map((unit) => [unit.code, unit]));
    const results = [];

    for (const { row, values } of records) {
      const email = emailSchema.safeParse(values.email);

      if (!values.name || !email.success) {
        results.push({
          row,
          email: values.email || null,
          status: "failed",
          code: ERROR_CODES.VALIDATION,
          message: "Nombre o correo inválido",
        });
        continue;
      }

      const unit = values.unitCode ? unitByCode.get(values.unitCode) : null;

      if (values.unitCode && !unit) {
        results.push({
          row,
          email: email.data,
          status: "failed",
          code: ERROR_CODES.ACADEMIC_UNIT_NOT_FOUND,
          message: `No existe la unidad "${values.unitCode}"`,
        });
        continue;
      }

      const gradeLevel = values.gradeCode
        ? (unit?.gradeLevels || []).find(
            (level) => level.code === values.gradeCode,
          )
        : null;

      if (values.gradeCode && !gradeLevel) {
        results.push({
          row,
          email: email.data,
          status: "failed",
          code: ERROR_CODES.GRADE_LEVEL_NOT_FOUND,
          message: `No existe el grado "${values.gradeCode}" en la unidad indicada`,
        });
        continue;
      }

      const existing = await tx.user.findUnique({
        where: { email: email.data },
        select: { id: true, institutionId: true },
      });

      if (existing) {
        const sameInstitution = existing.institutionId === id;

        results.push({
          row,
          email: email.data,
          status: sameInstitution ? "skipped" : "failed",
          code: ERROR_CODES.AUTH_EMAIL_TAKEN,
          message: sameInstitution
            ? "Ya existe en la institución"
            : "El correo pertenece a otra institución",
        });
        continue;
      }

      if (maxStudents !== null && students >= maxStudents) {
        results.push({
          row,
          email: email.data,
          status: "failed",
          code: ERROR_CODES.PLAN_STUDENT_LIMIT_REACHED,
          message: `El plan admite ${maxStudents} estudiantes y ya están ocupados`,
        });
        continue;
      }

      const created = await tx.user.create({
        data: {
          name: values.name,
          email: email.data,
          password: invitations.PASSWORD_UNTIL_INVITATION_ACCEPTED,
          role: "student",
          institutionId: id,
          academicUnitId: unit?.id || null,
          gradeLevelId: gradeLevel?.id || null,
          program: values.program || null,
          termNumber: values.termNumber ? Number(values.termNumber) : null,
        },
      });

      await tx.wallet.create({
        data: { userId: created.id, currency: institution.currencyCode },
      });

      await invitations.issue(tx, {
        institutionId: id,
        email: email.data,
        role: "student",
        name: values.name,
        invitedById: audit.actorOf(ctx),
      });

      students += 1;

      results.push({
        row,
        email: email.data,
        status: "created",
        userId: created.id,
      });
    }

    const createdCount = results.filter(
      (result) => result.status === "created",
    ).length;

    if (createdCount > 0)
      await subscriptions.registerStudent(tx, id, createdCount);

    return finish(tx, results);
  });
};

const importSubjects = async (ctx, csv, { dryRun = false, institutionId } = {}) => {
  const id = requireInstitution(ctx, institutionId);
  const records = toRecords(csv, ["code", "name"]);

  return runImport(ctx, id, dryRun, "subjects", async (tx, finish) => {
    const units = await tx.academicUnit.findMany({
      where: { institutionId: id },
      select: { id: true, code: true },
    });

    const unitByCode = new Map(units.map((unit) => [unit.code, unit]));
    const results = [];

    for (const { row, values } of records) {
      if (!values.code || !values.name) {
        results.push({
          row,
          subject: values.code || null,
          status: "failed",
          code: ERROR_CODES.VALIDATION,
          message: "Código o nombre vacío",
        });
        continue;
      }

      const unit = values.unitCode ? unitByCode.get(values.unitCode) : null;

      if (values.unitCode && !unit) {
        results.push({
          row,
          subject: values.code,
          status: "failed",
          code: ERROR_CODES.ACADEMIC_UNIT_NOT_FOUND,
          message: `No existe la unidad "${values.unitCode}"`,
        });
        continue;
      }

      const existing = await tx.subject.findUnique({
        where: { institutionId_code: { institutionId: id, code: values.code } },
      });

      if (existing) {
        results.push({
          row,
          subject: values.code,
          status: "skipped",
          code: ERROR_CODES.SUBJECT_CODE_TAKEN,
          message: "Ya existe una materia con ese código",
        });
        continue;
      }

      const isGeneral = ["true", "1", "si", "sí"].includes(
        String(values.isGeneral || "").toLowerCase(),
      );

      const subject = await tx.subject.create({
        data: {
          institutionId: id,
          code: values.code,
          name: values.name,
          termNumber: values.termNumber ? Number(values.termNumber) : null,
          credits: values.credits ? Number(values.credits) : null,
          isGeneral,
        },
      });

      if (unit)
        await tx.unitSubject.create({
          data: { academicUnitId: unit.id, subjectId: subject.id },
        });

      results.push({ row, subject: values.code, status: "created", subjectId: subject.id });
    }

    return finish(tx, results);
  });
};

module.exports = { importStudents, importSubjects };
