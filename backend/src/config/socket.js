// config/socket.js
let io;

function setIO(serverInstance) {
  io = serverInstance;
}

function getIO() {
  if (!io) throw new Error("Socket.io no está inicializado");
  return io;
}

module.exports = { setIO, getIO };