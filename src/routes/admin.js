const express = require("express");
const { authenticate, authorize } = require("../middleware/auth");
const { getDB } = require("../db");

const router = express.Router();
router.get("/users", authenticate, authorize("admin"), async (req, res, next) => {
  try {
    const users = await getDB().collection("users")
      .find({}, { projection: { password: 0 } }).sort({ createdAt: -1 }).toArray();
    res.json({ count: users.length, users: users.map(u => ({ ...u, _id: u._id.toString() })) });
  } catch (error) { next(error); }
});

module.exports = router;
