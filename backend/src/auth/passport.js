import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as GitHubStrategy } from "passport-github2";
import prisma from "../utils/prisma.js";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:4000";

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  try {
    const user = await prisma.user.findUnique({ where: { id } });
    done(null, user || false);
  } catch (err) {
    done(err);
  }
});

// ----- Google -----
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: `${BACKEND_URL}/api/auth/google/callback`,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value?.toLowerCase();
          if (!email) return done(new Error("No email from Google"));

          let user = await prisma.user.findUnique({
            where: { googleId: profile.id },
          });

          if (!user) {
            user = await prisma.user.findUnique({ where: { email } });
            if (user) {
              user = await prisma.user.update({
                where: { id: user.id },
                data: { googleId: profile.id },
              });
            }
          }

          if (!user) {
            user = await prisma.user.create({
              data: {
                email,
                name: profile.displayName || null,
                googleId: profile.id,
              },
            });
          }

          done(null, user);
        } catch (err) {
          done(err);
        }
      }
    )
  );
  console.log("✅ Google OAuth strategy loaded");
}

// ----- GitHub -----
if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
  passport.use(
    new GitHubStrategy(
      {
        clientID: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
        callbackURL: `${BACKEND_URL}/api/auth/github/callback`,
        scope: ["user:email"],
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email =
            profile.emails?.[0]?.value?.toLowerCase() ||
            `${profile.username}@users.noreply.github.com`;

          let user = await prisma.user.findUnique({
            where: { githubId: profile.id.toString() },
          });

          if (!user) {
            user = await prisma.user.findUnique({ where: { email } });
            if (user) {
              user = await prisma.user.update({
                where: { id: user.id },
                data: { githubId: profile.id.toString() },
              });
            }
          }

          if (!user) {
            user = await prisma.user.create({
              data: {
                email,
                name: profile.displayName || profile.username || null,
                githubId: profile.id.toString(),
              },
            });
          }

          done(null, user);
        } catch (err) {
          done(err);
        }
      }
    )
  );
  console.log("✅ GitHub OAuth strategy loaded");
}

export default passport;