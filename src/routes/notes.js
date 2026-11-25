const express = require("express");
const { ObjectId } = require("mongodb");
const { getDB } = require("../db");
const { authenticate } = require("../middleware/auth");
const events = require("../utils/events");

const router = express.Router();
router.use(authenticate);

router.post("/", async (req, res, next) => {
  try {
    const { title, content } = req.body || {};
    if (!title || !content) return res.status(400).json({ message: "title and content are required" });
    const now = new Date();
    const note = { title: String(title).trim(), content: String(content), owner: req.user._id, createdAt: now, updatedAt: now };
    const result = await getDB().collection("notes").insertOne(note);
    note._id = result.insertedId;
    events.emit("note:created", { noteId: result.insertedId.toString(), owner: req.user.email });
    res.status(201).json({ message: "Note created", note: { ...note, _id: note._id.toString(), owner: note.owner.toString() } });
  } catch (error) { next(error); }
});

router.get("/", async (req, res, next) => {
  try {
    const notes = await getDB().collection("notes").find({ owner: req.user._id }).sort({ updatedAt: -1 }).toArray();
    res.json({ count: notes.length, notes: notes.map(n => ({ ...n, _id: n._id.toString(), owner: n.owner.toString() })) });
  } catch (error) { next(error); }
});

router.get("/:id", async (req, res, next) => {
  try {
    if (!ObjectId.isValid(req.params.id)) return res.status(400).json({ message: "Invalid note id" });
    const note = await getDB().collection("notes").findOne({ _id: new ObjectId(req.params.id), owner: req.user._id });
    if (!note) return res.status(404).json({ message: "Note not found" });
    res.json({ note: { ...note, _id: note._id.toString(), owner: note.owner.toString() } });
  } catch (error) { next(error); }
});

router.put("/:id", async (req, res, next) => {
  try {
    if (!ObjectId.isValid(req.params.id)) return res.status(400).json({ message: "Invalid note id" });
    const updates = {};
    if (typeof req.body.title === "string") updates.title = req.body.title.trim();
    if (typeof req.body.content === "string") updates.content = req.body.content;
    if (!Object.keys(updates).length) return res.status(400).json({ message: "Provide title or content to update" });
    updates.updatedAt = new Date();
    const result = await getDB().collection("notes").findOneAndUpdate(
      { _id: new ObjectId(req.params.id), owner: req.user._id },
      { $set: updates }, { returnDocument: "after" }
    );
    if (!result) return res.status(404).json({ message: "Note not found" });
    const note = result;
    res.json({ message: "Note updated", note: { ...note, _id: note._id.toString(), owner: note.owner.toString() } });
  } catch (error) { next(error); }
});

router.delete("/:id", async (req, res, next) => {
  try {
    if (!ObjectId.isValid(req.params.id)) return res.status(400).json({ message: "Invalid note id" });
    const result = await getDB().collection("notes").deleteOne({ _id: new ObjectId(req.params.id), owner: req.user._id });
    if (!result.deletedCount) return res.status(404).json({ message: "Note not found" });
    res.json({ message: "Note deleted successfully" });
  } catch (error) { next(error); }
});

module.exports = router;
