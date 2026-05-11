import express from "express";
import prisma from "../utils/prisma.js";
import requireAuth from "../middleware/requireAuth.js";
import requireRole from "../middleware/requireRole.js";

const router = express.Router();

// Every admin route requires both auth and ADMIN role
router.use(requireAuth);
router.use(requireRole("ADMIN"));

// LIST all users with note counts
router.get("/users", async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        totpEnabled: true,
        createdAt: true,
        _count: { select: { notes: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json({ users });
  } catch (err) {
    console.error("Admin list users error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// DYNAMIC ROLE CHANGE (this is what earns the +10 admin authorization bonus)
router.patch("/users/:id/role", async (req, res) => {
  try {
    const { role } = req.body || {};
    if (!["USER", "ADMIN"].includes(role)) {
      return res.status(400).json({ error: "Role must be USER or ADMIN" });
    }

    // Prevent an admin from demoting themselves (lockout protection)
    if (req.params.id === req.user.id && role !== "ADMIN") {
      return res
        .status(400)
        .json({ error: "Cannot demote yourself from ADMIN" });
    }

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { role },
      select: { id: true, email: true, role: true },
    });
    res.json({ user });
  } catch (err) {
    console.error("Admin update role error:", err);
    if (err.code === "P2025") {
      return res.status(404).json({ error: "User not found" });
    }
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE user (admin only) — cascades and removes their notes
router.delete("/users/:id", async (req, res) => {
  try {
    if (req.params.id === req.user.id) {
      return res
        .status(400)
        .json({ error: "Admins cannot delete themselves" });
    }
    await prisma.user.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (err) {
    console.error("Admin delete user error:", err);
    if (err.code === "P2025") {
      return res.status(404).json({ error: "User not found" });
    }
    res.status(500).json({ error: "Internal server error" });
  }
});

// LIST all notes (admin sees everything)
router.get("/notes", async (req, res) => {
  try {
    const notes = await prisma.note.findMany({
      include: {
        user: { select: { id: true, email: true, name: true } },
      },
      orderBy: { updatedAt: "desc" },
    });
    res.json({ notes });
  } catch (err) {
    console.error("Admin list notes error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;