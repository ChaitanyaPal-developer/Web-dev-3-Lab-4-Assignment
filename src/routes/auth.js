const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { ObjectId } = require("mongodb");
const { getDB } = require("../db");
const { bcryptRounds, jwtSecret, jwtExpiresIn } = require("../config");
const events = require("../utils/events");
const { authenticate } = require("../middleware/auth");

const router = express.Router();

router.post("/signup", async (req, res, next) => {
  try {
    const { username, email, password } = req.body || {};
    if (!username || !email || !password) {
      return res.status(400).json({ message: "username, email and password are required" });
    }
    if (typeof password !== "string" || password.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters" });
    }
    const normalizedEmail = String(email).trim().toLowerCase();
    const users = getDB().collection("users");
    const existing = await users.findOne({ email: normalizedEmail });
    if (existing) return res.status(409).json({ message: "Email is already registered" });

    const passwordHash = await bcrypt.hash(password, bcryptRounds);
    const user = {
      username: String(username).trim(),
      email: normalizedEmail,
      password: passwordHash,
      role: "user",
      createdAt: new Date()
    };
    const result = await users.insertOne(user);
    events.emit("user:registered", { userId: result.insertedId.toString(), email: normalizedEmail });
    return res.status(201).json({
      message: "User registered successfully",
      user: { id: result.insertedId.toString(), username: user.username, email: user.email, role: user.role }
    });
  } catch (error) { next(error); }
});

router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ message: "email and password are required" });
    const user = await getDB().collection("users").findOne({ email: String(email).trim().toLowerCase() });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: "Invalid email or password" });
    }
    const token = jwt.sign(
      { userId: user._id.toString(), role: user.role },
      jwtSecret,
      { expiresIn: jwtExpiresIn }
    );
    return res.json({
      message: "Login successful",
      token,
      user: { id: user._id.toString(), username: user.username, email: user.email, role: user.role }
    });
  } catch (error) { next(error); }
});

router.get("/me", authenticate, (req, res) => {
  res.json({ user: { id: req.user._id.toString(), username: req.user.username, email: req.user.email, role: req.user.role } });
});

module.exports = router;
