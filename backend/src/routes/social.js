import express from "express";
import passport from "../auth/passport.js";
import { signAccessToken, signRefreshToken } from "../utils/jwt.js";

const router = express.Router();

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

const cookieOpts = {
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: "/api/auth",
};

function issueTokensAndRedirect(req, res) {
  if (!req.user) {
    return res.redirect(`${FRONTEND_URL}/login?error=oauth_failed`);
  }
  const accessToken = signAccessToken({
    sub: req.user.id,
    role: req.user.role,
  });
  const refreshToken = signRefreshToken({ sub: req.user.id });
  res.cookie("refreshToken", refreshToken, cookieOpts);

  res.redirect(`${FRONTEND_URL}/oauth/callback#token=${accessToken}`);
}

router.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
    session: false,
  })
);

router.get(
  "/google/callback",
  passport.authenticate("google", {
    failureRedirect: `${FRONTEND_URL}/login?error=google_failed`,
    session: false,
  }),
  issueTokensAndRedirect
);

router.get(
  "/github",
  passport.authenticate("github", {
    scope: ["user:email"],
    session: false,
  })
);

router.get(
  "/github/callback",
  passport.authenticate("github", {
    failureRedirect: `${FRONTEND_URL}/login?error=github_failed`,
    session: false,
  }),
  issueTokensAndRedirect
);

export default router;