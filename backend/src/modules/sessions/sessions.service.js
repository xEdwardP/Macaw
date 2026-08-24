const prisma = require("../../config/prisma");
const memberships = require("../tutors/memberships.service");
const { commissionRateFor } = require("../../config/platform");
const sessionMoney = require("./sessions.money");
const outbox = require("../../shared/events/outbox");
const notifications = require("../notifications/notifications.service");
const { money, multiply, subtract, greaterThan } = require("../../shared/money/money");
const {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} = require("../../shared/errors/AppError");
const ERROR_CODES = require("../../shared/errors/codes");
const {
  getCurrentTime,
  getWeekday,
  isSlotWithinBlock,
  doSlotsOverlap,
  getSessionStartDateTime,
} = require("../../utils/dateTime");

const sessionInclude = {
  student: { select: { id: true, name: true, email: true, avatar: true } },
  tutor: { select: { id: true, name: true, email: true, avatar: true } },
  subject: true,
  review: true,
};

const notifyMake = (eventType, data, client = prisma) =>
  outbox.publish(client, eventType, data);

const notify = async (userId, type, payload) => {
  if (!userId) return;

  const notification = await notifications.create(prisma, {
    userId,
    type,
    payload,
  });

  notifications.emit(notification);
};

const transitionTo = async (client, sessionId, from, to, extra = {}) => {
  const moved = await client.session.updateMany({
    where: { id: sessionId, status: from },
    data: { status: to, ...extra },
  });

  if (moved.count === 0)
    throw new ConflictError(
      ERROR_CODES.SESSION_STATE_CHANGED,
      "La sesión cambió de estado mientras se procesaba. Vuelve a intentarlo.",
    );
};

const sessionPayload = (session, extra = {}) => ({
  sessionId: session.id,
  subject: session.subject?.name || null,
  date: session.date,
  startTime: session.startTime,
  ...extra,
});

const visibleSessionsFor = (user) => {
  if (user.role === "student") return { studentId: user.id };
  if (user.role === "tutor") return { tutorId: user.id };
  if (user.role === "platform_admin") return {};

  if (
    ["institution_admin", "institution_staff"].includes(user.role) &&
    user.institutionId
  )
    return { institutionId: user.institutionId };

  throw new ForbiddenError(
    ERROR_CODES.SESSION_ACCESS_DENIED,
    "No autorizado",
  );
};

const getAll = async (user) => {
  return await prisma.session.findMany({
    where: visibleSessionsFor(user),
    include: sessionInclude,
    orderBy: { date: "desc" },
  });
};

const getOne = async (id, user) => {
  const session = await prisma.session.findUnique({
    where: { id },
    include: sessionInclude,
  });

  if (!session) throw new NotFoundError(ERROR_CODES.SESSION_NOT_FOUND, "Sesión no encontrada");

  if (
    user.role !== "platform_admin" &&
    session.studentId !== user.id &&
    session.tutorId !== user.id
  )
    throw new ForbiddenError(ERROR_CODES.SESSION_ACCESS_DENIED, "No tienes acceso a esta sesión");

  return session;
};

const create = async (
  ctx,
  { tutorId, subjectId, date, startTime, endTime, notes },
) => {
  const studentId = ctx.user.id;

  if (!startTime || !endTime || startTime >= endTime)
    throw new BadRequestError(ERROR_CODES.SESSION_INVALID_TIME_RANGE, "El horario solicitado no es válido");

  const tutor = await prisma.user.findUnique({
    where: { id: tutorId, role: "tutor" },
    include: {
      institution: {
        select: { id: true, type: true, currencyCode: true, settings: true },
      },
      tutorProfile: {
        include: { availability: true, subjects: true },
      },
    },
  });
  if (!tutor || !tutor.isActive) throw new NotFoundError(ERROR_CODES.TUTOR_NOT_FOUND, "Tutor no encontrado");
  if (!tutor.tutorProfile) throw new NotFoundError(ERROR_CODES.TUTOR_PROFILE_NOT_FOUND, "El tutor no tiene perfil activo");

  const student = await prisma.user.findUnique({
    where: { id: studentId },
    select: { id: true, name: true, institutionId: true },
  });
  if (!student) throw new NotFoundError(ERROR_CODES.USER_NOT_FOUND, "Estudiante no encontrado");

  if (!student.institutionId)
    throw new BadRequestError(
      ERROR_CODES.INSTITUTION_REQUIRED,
      "Necesitas pertenecer a una institución para reservar tutorías",
    );

  await memberships.assertVerifiedIn(tutorId, student.institutionId);

  const subject = await prisma.subject.findUnique({ where: { id: subjectId } });
  if (!subject) throw new NotFoundError(ERROR_CODES.SUBJECT_NOT_FOUND, "Materia no encontrada");

  const teachesSubject = tutor.tutorProfile.subjects.some(
    (s) => s.subjectId === subjectId,
  );
  if (!teachesSubject) throw new BadRequestError(ERROR_CODES.TUTOR_DOES_NOT_TEACH_SUBJECT, "El tutor no imparte esta materia");

  const sessionDay = getWeekday(date);
  const dayBlocks = tutor.tutorProfile.availability.filter(
    (a) => a.dayOfWeek === sessionDay,
  );
  if (dayBlocks.length === 0)
    throw new BadRequestError(ERROR_CODES.TUTOR_UNAVAILABLE_DAY, "El tutor no tiene disponibilidad ese día");

  const fitsInAnyBlock = dayBlocks.some((block) =>
    isSlotWithinBlock(block.startTime, block.endTime, startTime, endTime),
  );
  if (!fitsInAnyBlock)
    throw new BadRequestError(
      ERROR_CODES.TUTOR_SLOT_OUTSIDE_AVAILABILITY,
      "El horario solicitado está fuera de la disponibilidad del tutor",
    );

  const now = getCurrentTime();
  const [y, m, d] = date.split("-").map(Number);
  const [startHour, startMinute] = startTime.split(":").map(Number);

  const sessionDateTime = new Date(y, m - 1, d, startHour, startMinute, 0);

  if (sessionDateTime <= now)
    throw new BadRequestError(ERROR_CODES.SESSION_IN_THE_PAST, "No puedes reservar una sesión en una fecha u hora pasada");

  const price = money(tutor.tutorProfile.hourlyRate);
  const currency = ctx.institution?.currencyCode || tutor.institution?.currencyCode;
  const commissionRate = await commissionRateFor(student.institutionId);
  const meetingUrl = `https://meet.jit.si/macaw-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

  const session = await prisma.$transaction(async (tx) => {
    const sameDayWhere = {
      date: new Date(date),
      status: { in: ["pending", "confirmed"] },
    };

    const [tutorSessions, studentSessions] = await Promise.all([
      tx.session.findMany({
        where: { ...sameDayWhere, tutorId },
        select: { startTime: true, endTime: true },
      }),
      tx.session.findMany({
        where: { ...sameDayWhere, studentId },
        select: { startTime: true, endTime: true },
      }),
    ]);

    const overlaps = (sessions) =>
      sessions.some((s) =>
        doSlotsOverlap(startTime, endTime, s.startTime, s.endTime),
      );

    if (overlaps(tutorSessions))
      throw new ConflictError(ERROR_CODES.SESSION_TUTOR_SLOT_TAKEN, "El tutor ya tiene una sesión en ese horario");
    if (overlaps(studentSessions))
      throw new ConflictError(ERROR_CODES.SESSION_STUDENT_SLOT_TAKEN, "Ya tienes una sesión reservada en ese horario");

    const wallet = await tx.wallet.findUnique({ where: { userId: studentId } });
    if (!wallet) throw new NotFoundError(ERROR_CODES.WALLET_NOT_FOUND, "Wallet no encontrada");

    sessionMoney.assertWalletCurrency(wallet, currency);

    if (greaterThan(price, wallet.balance))
      throw new BadRequestError(ERROR_CODES.WALLET_INSUFFICIENT_BALANCE, "Saldo insuficiente", {
        required: price.toNumber(),
        available: money(wallet.balance).toNumber(),
        currency,
      });

    const newSession = await tx.session.create({
      data: {
        institutionId: student.institutionId,
        studentId,
        tutorId,
        subjectId,
        date: new Date(date),
        startTime,
        endTime,
        price,
        currency,
        commissionRate,
        notes,
        meetingUrl,
        status: "pending",
      },
      include: sessionInclude,
    });

    await sessionMoney.freezeForBooking(tx, {
      session: newSession,
      studentId,
      tutorName: tutor.name,
    });

    await notifyMake(
      "session_booked",
      {
        tutorName: tutor.name,
        tutorEmail: tutor.email,
        studentName: student.name,
        subject: newSession.subject?.name || subjectId,
        date: new Date(newSession.date).toLocaleDateString("es-HN"),
        startTime: newSession.startTime,
        meetingUrl: newSession.meetingUrl,
      },
      tx,
    );

    return newSession;
  });

  await notify(
    session.tutorId,
    "session_booked",
    sessionPayload(session, { counterpart: student.name }),
  );

  return session;
};

const confirm = async (sessionId, tutorId) => {
  const session = await prisma.session.findUnique({ where: { id: sessionId } });
  if (!session) throw new NotFoundError(ERROR_CODES.SESSION_NOT_FOUND, "Sesión no encontrada");
  if (session.tutorId !== tutorId) throw new ForbiddenError(ERROR_CODES.SESSION_ACCESS_DENIED, "No autorizado");
  if (session.status !== "pending")
    throw new ConflictError(ERROR_CODES.SESSION_NOT_PENDING, "La sesión no está pendiente");

  await transitionTo(prisma, sessionId, "pending", "confirmed");

  const updated = await prisma.session.findUnique({
    where: { id: sessionId },
    include: sessionInclude,
  });

  const [student, tutor] = await Promise.all([
    prisma.user.findUnique({ where: { id: session.studentId } }),
    prisma.user.findUnique({ where: { id: session.tutorId } }),
  ]);
  const date = new Date(session.date).toLocaleDateString("es-HN");

  await notifyMake("session_confirmed", {
    studentName: student.name,
    studentEmail: student.email,
    tutorName: tutor.name,
    date,
    startTime: session.startTime,
    meetingUrl: session.meetingUrl,
  });

  await notify(
    session.studentId,
    "session_confirmed",
    sessionPayload(updated, { counterpart: tutor.name }),
  );

  return updated;
};

const cancel = async (sessionId, user) => {
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: {
      student: { include: { wallet: true } },
      tutor: { include: { wallet: true } },
    },
  });

  if (!session) throw new NotFoundError(ERROR_CODES.SESSION_NOT_FOUND, "Sesión no encontrada");

  if (
    user.role !== "platform_admin" &&
    session.studentId !== user.id &&
    session.tutorId !== user.id
  )
    throw new ForbiddenError(ERROR_CODES.SESSION_ACCESS_DENIED, "No autorizado");

  if (
    ["completed", "cancelled", "disputed", "pending_confirmation"].includes(
      session.status,
    )
  )
    throw new ConflictError(
      ERROR_CODES.SESSION_NOT_CANCELLABLE,
      "La sesión no se puede cancelar",
    );

  const hoursUntilSession =
    (getSessionStartDateTime(session) - getCurrentTime()) / (1000 * 60 * 60);
  const isLateCancellation =
    hoursUntilSession < 24 && session.status === "confirmed";

  const tutorCompensation = isLateCancellation
    ? multiply(session.price, 0.5)
    : money(0);
  const refundAmount = subtract(session.price, tutorCompensation);

  await prisma.$transaction(async (tx) => {
    await transitionTo(tx, sessionId, session.status, "cancelled");

    await sessionMoney.refundSession(tx, session, {
      refundAmount,
      tutorCompensation,
      reason: "session.cancelled",
      refundDescription: isLateCancellation
        ? "Reembolso del 50% por cancelación con menos de 24hrs"
        : "Reembolso completo por cancelación",
    });
  });

  const student = await prisma.user.findUnique({
    where: { id: session.studentId },
  });
  const date = new Date(session.date).toLocaleDateString("es-HN");

  await notifyMake("session_cancelled", {
    studentName: student.name,
    studentEmail: student.email,
    tutorName: session.tutor.name,
    tutorEmail: session.tutor.email,
    date,
    startTime: session.startTime,
    refundAmount,
    isLateCancellation,
  });

  const cancelledBy = user.id === session.studentId ? student : session.tutor;

  for (const recipientId of [session.studentId, session.tutorId])
    if (recipientId !== user.id)
      await notify(
        recipientId,
        "session_cancelled",
        sessionPayload(session, { counterpart: cancelledBy.name }),
      );

  return await prisma.session.findUnique({
    where: { id: sessionId },
    include: sessionInclude,
  });
};

const complete = async (sessionId, tutorId) => {
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: { tutor: { include: { wallet: true } } },
  });

  if (!session) throw new NotFoundError(ERROR_CODES.SESSION_NOT_FOUND, "Sesión no encontrada");
  if (session.tutorId !== tutorId) throw new ForbiddenError(ERROR_CODES.SESSION_ACCESS_DENIED, "No autorizado");
  if (session.status !== "confirmed")
    throw new ConflictError(ERROR_CODES.SESSION_NOT_CONFIRMED, "La sesión no está confirmada");

  await transitionTo(prisma, sessionId, "confirmed", "pending_confirmation");

  const student = await prisma.user.findUnique({
    where: { id: session.studentId },
  });
  const tutor = await prisma.user.findUnique({ where: { id: tutorId } });
  const date = new Date(session.date).toLocaleDateString("es-HN");

  await notifyMake("session_pending_confirmation", {
    studentName: student.name,
    studentEmail: student.email,
    tutorName: tutor.name,
    date,
    startTime: session.startTime,
  });

  await notify(
    session.studentId,
    "session_pending_confirmation",
    sessionPayload(session, { counterpart: tutor.name }),
  );

  return await prisma.session.findUnique({
    where: { id: sessionId },
    include: sessionInclude,
  });
};

const studentConfirm = async (sessionId, studentId) => {
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: { tutor: { include: { wallet: true } } },
  });

  if (!session) throw new NotFoundError(ERROR_CODES.SESSION_NOT_FOUND, "Sesión no encontrada");
  if (session.studentId !== studentId) throw new ForbiddenError(ERROR_CODES.SESSION_ACCESS_DENIED, "No autorizado");
  if (session.status !== "pending_confirmation")
    throw new ConflictError(ERROR_CODES.SESSION_NOT_PENDING_CONFIRMATION, "La sesión no está pendiente de confirmación");

  const { net: tutorEarnings } = await prisma.$transaction(async (tx) => {
    await transitionTo(tx, sessionId, "pending_confirmation", "completed");

    return sessionMoney.settleSession(tx, session, {
      reason: "session.completed",
      description: "Pago recibido por sesión completada",
    });
  });

  const student = await prisma.user.findUnique({ where: { id: studentId } });
  const tutor = await prisma.user.findUnique({
    where: { id: session.tutorId },
  });
  const date = new Date(session.date).toLocaleDateString("es-HN");

  await notifyMake("session_completed", {
    studentName: student.name,
    studentEmail: student.email,
    tutorName: tutor.name,
    tutorEmail: tutor.email,
    date,
    startTime: session.startTime,
    tutorEarnings,
  });

  await notify(
    session.tutorId,
    "session_completed",
    sessionPayload(session, { counterpart: student.name, amount: tutorEarnings }),
  );

  return await prisma.session.findUnique({
    where: { id: sessionId },
    include: sessionInclude,
  });
};

const dispute = async (sessionId, studentId, reason) => {
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: { tutor: true, student: true },
  });

  if (!session) throw new NotFoundError(ERROR_CODES.SESSION_NOT_FOUND, "Sesión no encontrada");
  if (session.studentId !== studentId) throw new ForbiddenError(ERROR_CODES.SESSION_ACCESS_DENIED, "No autorizado");
  if (session.status !== "pending_confirmation")
    throw new ConflictError(ERROR_CODES.SESSION_NOT_PENDING_CONFIRMATION, "Solo puedes reportar sesiones pendientes de confirmación");

  await transitionTo(prisma, sessionId, "pending_confirmation", "disputed", {
    notes: reason || session.notes,
  });

  const admins = await prisma.user.findMany({ where: { role: "platform_admin" } });

  await notifyMake("session_disputed", {
    adminEmails: admins.map((a) => a.email),
    adminName: admins[0]?.name || "Administrador",
    studentName: session.student.name,
    tutorName: session.tutor.name,
    date: new Date(session.date).toLocaleDateString("es-HN"),
    startTime: session.startTime,
    reason: reason || "Sin razón especificada",
    sessionId,
  });

  for (const admin of admins)
    await notify(
      admin.id,
      "session_disputed",
      sessionPayload(session, {
        counterpart: session.student.name,
        reason: reason || null,
      }),
    );

  return await prisma.session.findUnique({
    where: { id: sessionId },
    include: sessionInclude,
  });
};

const resolve = async (sessionId, favorOf) => {
  if (!["student", "tutor"].includes(favorOf))
    throw new BadRequestError(ERROR_CODES.SESSION_INVALID_RESOLUTION, "favorOf debe ser student o tutor");

  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: { tutor: { include: { wallet: true } } },
  });

  if (!session) throw new NotFoundError(ERROR_CODES.SESSION_NOT_FOUND, "Sesión no encontrada");
  if (session.status !== "disputed")
    throw new ConflictError(ERROR_CODES.SESSION_NOT_DISPUTED, "La sesión no está en disputa");

  if (favorOf === "student") {
    await prisma.$transaction(async (tx) => {
      await transitionTo(tx, sessionId, "disputed", "cancelled");

      await sessionMoney.refundSession(tx, session, {
        refundAmount: session.price,
        tutorCompensation: 0,
        reason: "session.dispute_resolved_student",
        refundDescription:
          "Reembolso por disputa resuelta a favor del estudiante",
      });
    });

    const student = await prisma.user.findUnique({
      where: { id: session.studentId },
    });

    await notifyMake("dispute_resolved", {
      recipientName: student.name,
      recipientEmail: student.email,
      favorOf: "student",
      amount: session.price,
    });

    await notify(
      session.studentId,
      "dispute_resolved",
      sessionPayload(session, { favorOf: "student", amount: session.price }),
    );
  } else {
    const { net: tutorEarnings } = await prisma.$transaction(async (tx) => {
      await transitionTo(tx, sessionId, "disputed", "completed");

      return sessionMoney.settleSession(tx, session, {
        reason: "session.dispute_resolved_tutor",
        description: "Pago recibido por disputa resuelta a tu favor",
      });
    });

    const tutor = await prisma.user.findUnique({
      where: { id: session.tutorId },
    });

    await notifyMake("dispute_resolved", {
      recipientName: tutor.name,
      recipientEmail: tutor.email,
      favorOf: "tutor",
      amount: tutorEarnings,
    });

    await notify(
      session.tutorId,
      "dispute_resolved",
      sessionPayload(session, { favorOf: "tutor", amount: tutorEarnings }),
    );
  }

  return await prisma.session.findUnique({
    where: { id: sessionId },
    include: sessionInclude,
  });
};

const getPaginated = async (user, { page = 1, limit = 10, status }) => {
  const where = visibleSessionsFor(user);
  if (status) where.status = status;

  const offset = (parseInt(page) - 1) * parseInt(limit);

  const [sessions, total] = await Promise.all([
    prisma.session.findMany({
      where,
      include: sessionInclude,
      orderBy: { date: "desc" },
      take: parseInt(limit),
      skip: offset,
    }),
    prisma.session.count({ where }),
  ]);

  return {
    data: sessions,
    total,
    page: parseInt(page),
    limit: parseInt(limit),
    totalPages: Math.ceil(total / parseInt(limit)),
  };
};

module.exports = {
  getAll,
  getOne,
  create,
  confirm,
  cancel,
  complete,
  studentConfirm,
  dispute,
  resolve,
  getPaginated,
};
