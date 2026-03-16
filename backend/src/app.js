require("dotenv").config();
const { scheduleReminders } = require('./jobs/sessionReminders')
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const http = require("http");
const { Server } = require("socket.io");
const { scheduleAutoConfirm } = require("./jobs/autoConfirm");

const app = express();
const server = http.createServer(app);

// Socket.io
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:5173",
  },
});

io.on("connection", (socket) => {
  socket.on("join", (userId) => {
    socket.join(`user:${userId}`);
  });
});

app.set("io", io);
scheduleReminders();
scheduleAutoConfirm();

// Middlewares
app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(morgan("dev"));
app.use(express.json());

// Rutas
app.use("/api/auth", require("./modules/auth/auth.routes"));
app.use("/api/users", require("./modules/users/users.routes"));
app.use("/api/tutors", require("./modules/tutors/tutors.routes"));
app.use("/api/sessions", require("./modules/sessions/sessions.routes"));
app.use("/api/wallet", require("./modules/wallet/wallet.routes"));
app.use("/api/reviews", require("./modules/reviews/reviews.routes"));
app.use("/api/ai", require("./modules/ai/ai.routes"));
app.use(
  "/api/universities",
  require("./modules/universities/universities.routes"),
);
app.use('/api/paypal', require('./modules/wallet/paypal.routes'));
app.use('/api/withdrawals', require('./modules/wallet/withdrawal.routes'));

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", app: "Macaw API" });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ success: false, message: err.message });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () =>
  console.log(`Macaw API corriendo en http://localhost:${PORT}`),
);
