import express from "express";
import bcrypt from "bcryptjs";
import rateLimit from "express-rate-limit";
import prisma from "../utils/prisma.js";
import requireAuth from "../middleware/requireAuth.js";
import {
  generateTotpSecret,
  totpQrDataUrl,
  verifyTotp,
  generateNumericCode,
} from "../utils/twofa.js";
import { sendOtpEmail } from "../utils/email.js";
import { signAccessToken, signRefreshToken } from "../utils/jwt.js";

const router = express.Router();

const twofaLimiter = rateLimit({
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

// ---------- TOTP SETUP ----------
router.post("/totp/setup", requireAuth, async (req, res) => {
  try {
    const secret = generateTotpSecret(req.user.email);
    await prisma.user.update({
      where: { id: req.user.id },
      data: { totpSecret: secret.base32, totpEnabled: false },
    });
    const qr = await totpQrDataUrl(secret.otpauth_url);
    res.json({ qr, secret: secret.base32 });
  } catch (err) {
    console.error("TOTP setup error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/totp/verify-setup", requireAuth, twofaLimiter, async (req, res) => {
  try {
    const { token } = req.body || {};
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user?.totpSecret) {
      return res.status(400).json({ error: "TOTP setup not initiated" });
    }
    if (!verifyTotp(user.totpSecret, token)) {
      return res.status(400).json({ error: "Invalid code" });
    }
    await prisma.user.update({
      where: { id: user.id },
      data: { totpEnabled: true },
    });
    res.json({ ok: true, totpEnabled: true });
  } catch (err) {
    console.error("TOTP verify-setup error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/totp/disable", requireAuth, twofaLimiter, async (req, res) => {
  try {
    const { password } = req.body || {};
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user?.password) {
      return res.status(400).json({ error: "Password required to disable 2FA" });
    }
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ error: "Invalid password" });

    await prisma.user.update({
      where: { id: user.id },
      data: { totpSecret: null, totpEnabled: false },
    });
    res.json({ ok: true, totpEnabled: false });
  } catch (err) {
    console.error("TOTP disable error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ---------- VERIFY TOTP LOGIN ----------
router.post("/totp/verify-login", twofaLimiter, async (req, res) => {
  try {
    const { userId, token } = req.body || {};
    if (!userId || !token) {
      return res.status(400).json({ error: "Missing userId or token" });
    }
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.totpEnabled || !user.totpSecret) {
      return res.status(400).json({ error: "TOTP not enabled for this user" });
    }
    if (!verifyTotp(user.totpSecret, token)) {
      return res.status(401).json({ error: "Invalid code" });
    }
    const accessToken = signAccessToken({ sub: user.id, role: user.role });
    const refreshToken = signRefreshToken({ sub: user.id });
    res.cookie("refreshToken", refreshToken, cookieOpts);
    res.json({
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
    console.error("TOTP verify-login error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ---------- EMAIL OTP ----------
router.post("/email/request", twofaLimiter, async (req, res) => {
  try {
    const { email } = req.body || {};
    if (typeof email !== "string") {
      return res.status(400).json({ error: "Email required" });
    }
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
    if (!user) return res.json({ ok: true }); // prevent enumeration

    const code = generateNumericCode(6);
    const expires = new Date(Date.now() + 5 * 60 * 1000);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailOtpCode: await bcrypt.hash(code, 10),
        emailOtpExpires: expires,
      },
    });

    try {
      await sendOtpEmail(user.email, code);
    } catch (mailErr) {
      console.error("Email send failed:", mailErr);
    }

    res.json({ ok: true });
  } catch (err) {
    console.error("Email request error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/email/verify", twofaLimiter, async (req, res) => {
  try {
    const { email, code } = req.body || {};
    if (typeof email !== "string" || typeof code !== "string") {
      return res.status(400).json({ error: "Email and code required" });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
    if (!user || !user.emailOtpCode || !user.emailOtpExpires) {
      return res.status(401).json({ error: "Invalid or expired code" });
    }
    if (user.emailOtpExpires < new Date()) {
      return res.status(401).json({ error: "Code expired" });
    }
    const ok = await bcrypt.compare(code, user.emailOtpCode);
    if (!ok) return res.status(401).json({ error: "Invalid code" });

    await prisma.user.update({
      where: { id: user.id },
      data: { emailOtpCode: null, emailOtpExpires: null },
    });

    const accessToken = signAccessToken({ sub: user.id, role: user.role });
    const refreshToken = signRefreshToken({ sub: user.id });
    res.cookie("refreshToken", refreshToken, cookieOpts);
    res.json({
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
    console.error("Email verify error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;