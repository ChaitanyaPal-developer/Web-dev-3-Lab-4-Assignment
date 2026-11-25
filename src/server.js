const http = require("http");
const express = require("express");
const jwt = require("jsonwebtoken");
const { Server } = require("socket.io");
const { port, jwtSecret } = require("./config");
const { connectDB, closeDB } = require("./db");
const authRoutes = require("./routes/auth");
const notesRoutes = require("./routes/notes");
const adminRoutes = require("./routes/admin");
const events = require("./utils/events");

async function start() {
  await connectDB();
  const app = express();
  app.disable("x-powered-by");
  app.use((req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "no-referrer");
    next();
  });
  app.use(express.json({ limit: "100kb" }));
  app.get("/", (req, res) => res.json({ message: "Secure Connect API is running" }));
  app.use("/api/auth", authRoutes);
  app.use("/api/notes", notesRoutes);
  app.use("/api/admin", adminRoutes);
  app.use((req, res) => res.status(404).json({ message: "Route not found" }));
  app.use((err, req, res, next) => {
    console.error(err);
    if (err.code === 11000) return res.status(409).json({ message: "Email is already registered" });
    res.status(500).json({ message: "Internal server error" });
  });

  const server = http.createServer(app);
  const io = new Server(server, { cors: { origin: "*" } });

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth && socket.handshake.auth.token;
      if (!token) return next(new Error("Authentication token required"));
      const payload = jwt.verify(token, jwtSecret);
      socket.data.userId = payload.userId;
      socket.data.username = payload.username || "user";
      next();
    } catch (error) { next(new Error("Invalid or expired token")); }
  });

  io.on("connection", socket => {
    console.log(`User connected: ${socket.data.userId}`);
    socket.on("join_room", roomName => {
      const room = typeof roomName === "string" ? roomName.trim().slice(0, 50) : "";
      if (!room) return;
      socket.join(room);
      socket.emit("joined_room", { room });
      console.log(`${socket.data.userId} joined room ${room}`);
    });
    socket.on("send_message", data => {
      if (!data || typeof data.message !== "string" || !data.message.trim()) return;
      const room = typeof data.room === "string" ? data.room.trim().slice(0, 50) : "";
      if (!room || !socket.rooms.has(room)) return;
      const payload = {
        userId: socket.data.userId,
        message: data.message.trim().slice(0, 2000),
        room,
        sentAt: new Date().toISOString()
      };
      io.to(room).emit("receive_message", payload);
      events.emit("chat:message", { username: socket.data.username, room });
    });
    socket.on("disconnect", () => console.log(`User disconnected: ${socket.data.userId}`));
  });

  server.listen(port, () => console.log(`Server listening on http://localhost:${port}`));
  const shutdown = async () => {
    server.close();
    await closeDB();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

start().catch(error => { console.error("Startup failed:", error); process.exit(1); });
