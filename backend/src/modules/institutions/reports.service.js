const prisma = require("../../config/prisma");
const { toCsv } = require("../../shared/csv/toCsv");
const { BadRequestError } = require("../../shared/errors/AppError");
const ERROR_CODES = require("../../shared/errors/codes");

const MAX_ROWS = 10000;

const date = (value) => (value ? new Date(value).toISOString().slice(0, 10) : "");

const decimal = (value) =>
  value === null || value === undefined ? "" : Number(value).toFixed(2);

const scopeOf = (ctx, institutionId) => {
  const target = ctx.isPlatformAdmin
    ? institutionId || ctx.institutionId
    : ctx.institutionId;

  if (!target)
    throw new BadRequestError(
      ERROR_CODES.INSTITUTION_REQUIRED,
      "Indica la institución del reporte",
    );

  return target;
};

const range = (from, to) =>
  from || to
    ? {
        ...(from ? { gte: new Date(from) } : {}),
        ...(to ? { lte: new Date(`${to}T23:59:59.999Z`) } : {}),
      }
    : undefined;

const students = async (institutionId, filters) => {
  const rows = await prisma.user.findMany({
    where: {
      institutionId,
      role: "student",
      ...(filters.search && {
        OR: [
          { name: { contains: filters.search, mode: "insensitive" } },
          { email: { contains: filters.search, mode: "insensitive" } },
        ],
      }),
      ...(filters.academicUnitId && { academicUnitId: filters.academicUnitId }),
    },
    orderBy: { name: "asc" },
    take: MAX_ROWS,
    select: {
      name: true,
      email: true,
      program: true,
      termNumber: true,
      isActive: true,
      emailVerifiedAt: true,
      createdAt: true,
      academicUnit: { select: { name: true } },
      gradeLevel: { select: { name: true } },
      wallet: { select: { balance: true, frozen: true, currency: true } },
      _count: { select: { sessionsAsStudent: true } },
    },
  });

  return toCsv(
    [
      { header: "nombre", value: (row) => row.name },
      { header: "correo", value: (row) => row.email },
      { header: "unidad", value: (row) => row.academicUnit?.name },
      { header: "grado", value: (row) => row.gradeLevel?.name },
      { header: "programa", value: (row) => row.program },
      { header: "periodo", value: (row) => row.termNumber },
      { header: "saldo", value: (row) => decimal(row.wallet?.balance) },
      { header: "retenido", value: (row) => decimal(row.wallet?.frozen) },
      { header: "moneda", value: (row) => row.wallet?.currency },
      { header: "sesiones", value: (row) => row._count.sessionsAsStudent },
      { header: "activo", value: (row) => (row.isActive ? "si" : "no") },
      {
        header: "correo_verificado",
        value: (row) => (row.emailVerifiedAt ? "si" : "no"),
      },
      { header: "alta", value: (row) => date(row.createdAt) },
    ],
    rows,
  );
};

const sessions = async (institutionId, filters) => {
  const rows = await prisma.session.findMany({
    where: {
      student: { institutionId },
      ...(filters.status && { status: filters.status }),
      ...(range(filters.from, filters.to) && {
        date: range(filters.from, filters.to),
      }),
    },
    orderBy: { date: "desc" },
    take: MAX_ROWS,
    select: {
      date: true,
      startTime: true,
      endTime: true,
      status: true,
      price: true,
      student: { select: { name: true, email: true } },
      tutor: { select: { name: true, email: true } },
      subject: { select: { name: true, code: true } },
    },
  });

  return toCsv(
    [
      { header: "fecha", value: (row) => date(row.date) },
      { header: "inicio", value: (row) => row.startTime },
      { header: "fin", value: (row) => row.endTime },
      { header: "estado", value: (row) => row.status },
      { header: "materia", value: (row) => row.subject?.name },
      { header: "codigo_materia", value: (row) => row.subject?.code },
      { header: "estudiante", value: (row) => row.student?.name },
      { header: "correo_estudiante", value: (row) => row.student?.email },
      { header: "tutor", value: (row) => row.tutor?.name },
      { header: "correo_tutor", value: (row) => row.tutor?.email },
      { header: "precio", value: (row) => decimal(row.price) },
    ],
    rows,
  );
};

const subsidies = async (institutionId, filters) => {
  const rows = await prisma.subsidy.findMany({
    where: {
      institutionId,
      ...(range(filters.from, filters.to) && {
        appliedAt: range(filters.from, filters.to),
      }),
    },
    orderBy: { appliedAt: "desc" },
    take: MAX_ROWS,
    select: {
      amount: true,
      currency: true,
      reason: true,
      appliedAt: true,
      student: { select: { name: true, email: true } },
    },
  });

  return toCsv(
    [
      { header: "fecha", value: (row) => date(row.appliedAt) },
      { header: "estudiante", value: (row) => row.student?.name },
      { header: "correo", value: (row) => row.student?.email },
      { header: "monto", value: (row) => decimal(row.amount) },
      { header: "moneda", value: (row) => row.currency },
      { header: "motivo", value: (row) => row.reason },
    ],
    rows,
  );
};

const tutors = async (institutionId) => {
  const rows = await prisma.user.findMany({
    where: {
      role: "tutor",
      tutorMemberships: { some: { institutionId } },
    },
    orderBy: { name: "asc" },
    take: MAX_ROWS,
    select: {
      name: true,
      email: true,
      isActive: true,
      academicUnit: { select: { name: true } },
      tutorMemberships: {
        where: { institutionId },
        select: { status: true, reviewedAt: true },
      },
      tutorProfile: {
        select: {
          hourlyRate: true,
          totalSessions: true,
          averageRating: true,
          _count: { select: { subjects: true } },
        },
      },
    },
  });

  return toCsv(
    [
      { header: "nombre", value: (row) => row.name },
      { header: "correo", value: (row) => row.email },
      { header: "unidad", value: (row) => row.academicUnit?.name },
      { header: "tarifa_hora", value: (row) => decimal(row.tutorProfile?.hourlyRate) },
      { header: "materias", value: (row) => row.tutorProfile?._count.subjects },
      { header: "sesiones", value: (row) => row.tutorProfile?.totalSessions },
      {
        header: "valoracion",
        value: (row) => row.tutorProfile?.averageRating?.toFixed(2),
      },
      {
        header: "verificado",
        value: (row) =>
          row.tutorMemberships[0]?.status === "verified" ? "si" : "no",
      },
      {
        header: "verificado_el",
        value: (row) => date(row.tutorMemberships[0]?.reviewedAt),
      },
      { header: "activo", value: (row) => (row.isActive ? "si" : "no") },
    ],
    rows,
  );
};

const BUILDERS = { students, sessions, subsidies, tutors };

const REPORTS = Object.keys(BUILDERS);

const build = async (ctx, report, filters = {}) => {
  const institutionId = scopeOf(ctx, filters.institutionId);
  const csv = await BUILDERS[report](institutionId, filters);

  return {
    csv,
    filename: `macaw-${report}-${new Date().toISOString().slice(0, 10)}.csv`,
  };
};

module.exports = { build, REPORTS };
