const { Server } = require("socket.io");
const env = require("./env");
const logger = require("./logger");
const prisma = require("./prisma");
const { verify } = require("../utils/jwt");

const roomOf = (userId) => `user:${userId}`;

let io = null;

const attach = (server) => {
  io = new Server(server, {
    path: "/socket.io",
    cors: { origin: env.corsOrigins, credentials: true },
    serveClient: false,
  });

  io.use(async (socket, next) => {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization?.replace(/^Bearer\s+/i, "");

    if (!token) return next(new Error("AUTH_TOKEN_MISSING"));

    let payload;
    try {
      payload = verify(token);
    } catch {
      return next(new Error("AUTH_TOKEN_INVALID"));
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.id },
      select: { id: true, isActive: true },
    });

    if (!user?.isActive) return next(new Error("AUTH_ACCOUNT_DISABLED"));

    socket.data.user = payload;
    return next();
  });

  io.on("connection", (socket) => {
    const { id } = socket.data.user;
    socket.join(roomOf(id));

    logger.debug({ userId: id, socketId: socket.id }, "Socket conectado");

    socket.on("disconnect", (reason) =>
      logger.debug({ userId: id, reason }, "Socket desconectado"),
    );
  });

  return io;
};

const emitToUser = (userId, event, payload) => {
  if (!io || !userId) return false;

  io.to(roomOf(userId)).emit(event, payload);
  return true;
};

const close = async () => {
  if (!io) return;
  await io.close();
  io = null;
};

module.exports = { attach, emitToUser, close, roomOf };
