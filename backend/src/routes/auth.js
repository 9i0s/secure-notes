import express from "express";
import bcrypt from "bcryptjs";
import rateLimit from "express-rate-limit";
import prisma from "../utils/prisma.js";
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "../utils/jwt.js";
import requireAuth from "../middleware/requireAuth.js";

const router = express.Router();

// Tight rate limit on auth endpoints to slow down brute-force attacks
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many attempts, please try again later." },
});

const cookieOpts = {
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: "/api/auth",
};

function isValidEmail(email) {
  return typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isStrongPassword(pw) {
  // 8+ chars, at least 1 letter and 1 number
  return typeof pw === "string" && pw.length >= 8 && /[A-Za-z]/.test(pw) && /[0-9]/.test(pw);
}

// ---------------- SIGNUP ----------------
router.post("/signup", authLimiter, async (req, res) => {
  try {
    const { email, password, name } = req.body || {};

    if (!isValidEmail(email)) {
      return res.status(400).json({ error: "Invalid email address" });
    }
    if (!isStrongPassword(password)) {
      return res.status(400).json({
        error:
          "Password must be at least 8 characters and contain letters and numbers",
      });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: "Email already registered" });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        password: passwordHash,
        name: typeof name === "string" ? name.slice(0, 100) : null,
      },
      select: { id: true, email: true, name: true, role: true },
    });

    return res.status(201).json({ user });
  } catch (err) {
    console.error("Signup error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ---------------- LOGIN ----------------
router.post("/login", authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (!isValidEmail(email) || typeof password !== "string") {
      return res.status(400).json({ error: "Invalid credentials" });
    }

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user || !user.password) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // If user enabled TOTP, return a flag so the frontend asks for the code
    if (user.totpEnabled) {
      return res.json({
        twoFactorRequired: true,
        method: "totp",
        userId: user.id,
      });
    }

    const accessToken = signAccessToken({ sub: user.id, role: user.role });
    const refreshToken = signRefreshToken({ sub: user.id });

    res.cookie("refreshToken", refreshToken, cookieOpts);

    return res.json({
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        totpEnabled: user.totpEnabled,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ---------------- REFRESH ----------------
router.post("/refresh", async (req, res) => {
  try {
    const token = req.cookies?.refreshToken;
    if (!token) return res.status(401).json({ error: "No refresh token" });

    const payload = verifyRefreshToken(token);
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) return res.status(401).json({ error: "User not found" });

    const accessToken = signAccessToken({ sub: user.id, role: user.role });
    return res.json({ accessToken });
  } catch (err) {
    return res.status(401).json({ error: "Invalid refresh token" });
  }
});

// ---------------- LOGOUT ----------------
router.post("/logout", (req, res) => {
  res.clearCookie("refreshToken", { path: "/api/auth" });
  return res.json({ ok: true });
});

// ---------------- ME ----------------
router.get("/me", requireAuth, (req, res) => {
  return res.json({ user: req.user });
});

export default router;