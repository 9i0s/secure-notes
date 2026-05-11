import express from "express";
import prisma from "../utils/prisma.js";
import requireAuth from "../middleware/requireAuth.js";

const router = express.Router();

// All notes routes require authentication
router.use(requireAuth);

function validateNoteInput({ title, content }) {
  if (typeof title !== "string" || title.trim().length === 0) {
    return "Title is required";
  }
  if (title.length > 200) {
    return "Title too long (max 200 chars)";
  }
  if (typeof content !== "string") {
    return "Content must be a string";
  }
  if (content.length > 10000) {
    return "Content too long (max 10000 chars)";
  }
  return null;
}

// LIST own notes
router.get("/", async (req, res) => {
  try {
    const notes = await prisma.note.findMany({
      where: { userId: req.user.id },
      orderBy: { updatedAt: "desc" },
    });
    res.json({ notes });
  } catch (err) {
    console.error("List notes error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET single note (must be owner)
router.get("/:id", async (req, res) => {
  try {
    const note = await prisma.note.findUnique({ where: { id: req.params.id } });
    if (!note) return res.status(404).json({ error: "Note not found" });
    if (note.userId !== req.user.id) {
      return res.status(403).json({ error: "Forbidden" });
    }
    res.json({ note });
  } catch (err) {
    console.error("Get note error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// CREATE note
router.post("/", async (req, res) => {
  try {
    const { title, content } = req.body || {};
    const err = validateNoteInput({ title, content });
    if (err) return res.status(400).json({ error: err });

    const note = await prisma.note.create({
      data: {
        title: title.trim(),
        content,
        userId: req.user.id,
      },
    });
    res.status(201).json({ note });
  } catch (err) {
    console.error("Create note error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// UPDATE note (must be owner)
router.put("/:id", async (req, res) => {
  try {
    const { title, content } = req.body || {};
    const err = validateNoteInput({ title, content });
    if (err) return res.status(400).json({ error: err });

    const existing = await prisma.note.findUnique({
      where: { id: req.params.id },
    });
    if (!existing) return res.status(404).json({ error: "Note not found" });
    if (existing.userId !== req.user.id) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const note = await prisma.note.update({
      where: { id: req.params.id },
      data: { title: title.trim(), content },
    });
    res.json({ note });
  } catch (err) {
    console.error("Update note error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE note (must be owner)
router.delete("/:id", async (req, res) => {
  try {
    const existing = await prisma.note.findUnique({
      where: { id: req.params.id },
    });
    if (!existing) return res.status(404).json({ error: "Note not found" });
    if (existing.userId !== req.user.id) {
      return res.status(403).json({ error: "Forbidden" });
    }
    await prisma.note.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (err) {
    console.error("Delete note error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;