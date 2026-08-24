const prisma = require("../../config/prisma");
const realtime = require("../../config/realtime");
const { NotFoundError } = require("../../shared/errors/AppError");
const ERROR_CODES = require("../../shared/errors/codes");

const create = (client, { userId, type, payload }) =>
  client.notification.create({
    data: { userId, type, payload: payload || null },
  });

const emit = (notification) => {
  if (!notification) return;
  realtime.emitToUser(notification.userId, "notification", notification);
};

const createMany = async (client, entries) => {
  const created = [];
  for (const entry of entries) created.push(await create(client, entry));
  return created;
};

const list = async (userId, { unreadOnly, page = 1, limit = 20 }) => {
  const where = { userId, ...(unreadOnly ? { readAt: null } : {}) };

  const take = parseInt(limit);
  const skip = (parseInt(page) - 1) * take;

  const [data, total, unread] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take,
      skip,
    }),
    prisma.notification.count({ where }),
    prisma.notification.count({ where: { userId, readAt: null } }),
  ]);

  return {
    data,
    total,
    unread,
    page: parseInt(page),
    limit: take,
    totalPages: Math.ceil(total / take),
  };
};

const markRead = async (userId, id) => {
  const notification = await prisma.notification.findFirst({
    where: { id, userId },
    select: { id: true, readAt: true },
  });

  if (!notification)
    throw new NotFoundError(
      ERROR_CODES.NOTIFICATION_NOT_FOUND,
      "Notificación no encontrada",
    );

  if (notification.readAt) return notification;

  return prisma.notification.update({
    where: { id },
    data: { readAt: new Date() },
  });
};

const markAllRead = async (userId) => {
  const { count } = await prisma.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  });

  return { updated: count };
};

module.exports = { create, createMany, emit, list, markRead, markAllRead };
