# 🔐 SecureNotes

A full-stack secure note-taking application with multi-factor authentication, social login (Google + GitHub), and role-based access control.

**🌐 Live Backend:** https://secure-notes-backend-wawg.onrender.com  
**📦 Repository:** https://github.com/9i0s/secure-notes

---

## ✨ Features

### Authentication
- ✅ Email + password signup and login (bcrypt hashing)
- ✅ JWT access tokens (15 min) + refresh tokens (7 days, httpOnly cookies)
- ✅ Automatic token refresh
- ✅ Rate limiting on auth endpoints
- ✅ Helmet security headers

### Two-Factor Authentication (2 methods)
- ✅ **TOTP** — Google Authenticator, Authy, etc. (via `speakeasy`)
- ✅ **Email OTP** — One-time code sent to email (via `nodemailer`)
- ✅ QR code generation for easy setup

### Social Login (2 providers)
- ✅ **Google OAuth 2.0** (via `passport-google-oauth20`)
- ✅ **GitHub OAuth 2.0** (via `passport-github2`)
- ✅ Auto-linking to existing accounts by email

### Authorization
- ✅ **Role-based access** — USER and ADMIN roles
- ✅ Admin dashboard: view all users, promote/demote, delete accounts
- ✅ Notes are owner-only (users only see their own)

### Notes
- ✅ Full CRUD: create, read, update, delete
- ✅ Each note tied to a user
- ✅ Timestamps on creation and updates

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| Backend runtime | Node.js 24 + Express |
| ORM | Prisma 6 |
| Database | PostgreSQL (production) / SQLite (local dev) |
| Auth | JWT + Passport.js |
| 2FA | Speakeasy (TOTP) + Nodemailer (email) |
| Frontend | React + Vite |
| Styling | Tailwind CSS v3 |
| HTTP | Axios |
| Hosting | Render (backend + database) |

---

## 🏗 Architecture

```
┌─────────────────┐         ┌─────────────────┐         ┌──────────────┐
│  React Frontend │ ──HTTPS─▶│  Express API   │ ──SQL──▶│  PostgreSQL  │
│   (Vite + TW)   │ ◀────────│   (Node.js)    │ ◀───────│   (Render)   │
└─────────────────┘  CORS    └─────────────────┘         └──────────────┘
                                      │
                                      ├──▶ Google OAuth
                                      ├──▶ GitHub OAuth
                                      └──▶ Ethereal SMTP
```

---

## 🚀 Local Setup

### Prerequisites
- Node.js 24+
- npm

### Backend
```bash
cd backend
npm install
# Create .env (see backend/.env.example)
npx prisma generate
npx prisma db push
npm run dev
```

Backend runs on `http://localhost:4000`.

### Frontend
```bash
cd frontend
npm install
# Create .env with: VITE_API_BASE_URL=http://localhost:4000/api
npm run dev
```

Frontend runs on `http://localhost:5173`.

---

## 🔑 Environment Variables

### Backend (.env)
```env
# Server
PORT=4000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
BACKEND_URL=http://localhost:4000

# Database
DATABASE_URL="postgresql://..."

# JWT
JWT_ACCESS_SECRET=...
JWT_REFRESH_SECRET=...

# Google OAuth
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# GitHub OAuth
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...

# Email (SMTP)
SMTP_HOST=smtp.ethereal.email
SMTP_PORT=587
SMTP_USER=...
SMTP_PASS=...
```

---

## 📁 Project Structure

```
secure-notes/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma           # User + Note models, USER/ADMIN roles
│   │   └── seed-admin.js           # Promote user to ADMIN
│   ├── src/
│   │   ├── auth/passport.js        # Google + GitHub strategies
│   │   ├── middleware/
│   │   │   ├── requireAuth.js      # JWT verification
│   │   │   └── requireRole.js      # Role-based access
│   │   ├── routes/
│   │   │   ├── auth.js             # signup, login, refresh, logout, me
│   │   │   ├── notes.js            # CRUD for notes
│   │   │   ├── admin.js            # User management (admin only)
│   │   │   ├── social.js           # OAuth flows
│   │   │   └── twofa.js            # TOTP + Email OTP
│   │   ├── utils/
│   │   │   ├── prisma.js           # Prisma client singleton
│   │   │   ├── jwt.js              # Token sign/verify helpers
│   │   │   ├── twofa.js            # speakeasy wrappers
│   │   │   └── email.js            # Nodemailer setup
│   │   └── index.js                # Express app
│   ├── api.http                    # REST Client test file
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.jsx
│   │   │   └── ProtectedRoute.jsx
│   │   ├── lib/
│   │   │   ├── api.js              # Axios instance + token refresh
│   │   │   └── AuthContext.jsx     # Auth state (user + tokens)
│   │   ├── pages/
│   │   │   ├── Home.jsx
│   │   │   ├── Login.jsx
│   │   │   ├── Signup.jsx
│   │   │   ├── OAuthCallback.jsx
│   │   │   ├── Verify2FA.jsx
│   │   │   ├── EmailOTP.jsx
│   │   │   ├── Setup2FA.jsx
│   │   │   ├── Notes.jsx
│   │   │   └── Admin.jsx
│   │   ├── App.jsx
│   │   └── main.jsx
│   └── package.json
├── screenshots/                    # UI and API screenshots
└── README.md
```

---

## 📸 Screenshots

### Live Backend Health Check
![Health Check](screenshots/01-health-check.png)

### Render Dashboard
![Render](screenshots/02-render-dashboard.png)

### Notes Dashboard
![Notes](screenshots/04-notes-list.png)

### Two-Factor Authentication Setup
![2FA Setup](screenshots/05-2fa-setup-qr.png)

### 2FA Login Verification
![2FA Verify](screenshots/06-2fa-verify.png)

### Email OTP Flow
![Email OTP](screenshots/07-email-otp.png)

### Admin Dashboard
![Admin](screenshots/08-admin-dashboard.png)

### GitHub OAuth Flow
![GitHub OAuth](screenshots/10-github-oauth.png)

---

## 🔒 Security Highlights

- **Password hashing:** bcrypt with 12 salt rounds
- **JWT tokens:** short-lived access (15 min), long-lived refresh (7 days, httpOnly cookie)
- **Rate limiting:** 5 req/15min on signup/login
- **CORS:** whitelist-based, credentialed
- **Helmet:** security headers
- **2FA:** TOTP (time-based, 30s window) and email OTP (6-digit, 10 min expiry)
- **Role checks:** middleware on every admin endpoint
- **Owner-only data:** users can only access their own notes

---

## 📡 API Endpoints

### Auth
- `POST /api/auth/signup` — Create account
- `POST /api/auth/login` — Email + password (returns access token or 2FA challenge)
- `POST /api/auth/refresh` — Get new access token
- `POST /api/auth/logout` — Clear refresh cookie
- `GET  /api/auth/me` — Current user info

### Social Auth
- `GET  /api/auth/google` — Start Google OAuth
- `GET  /api/auth/google/callback` — Callback
- `GET  /api/auth/github` — Start GitHub OAuth
- `GET  /api/auth/github/callback` — Callback

### 2FA
- `POST /api/2fa/totp/setup` — Generate QR code
- `POST /api/2fa/totp/verify-setup` — Confirm setup
- `POST /api/2fa/totp/verify-login` — Verify code during login
- `POST /api/2fa/email/request` — Send email OTP
- `POST /api/2fa/email/verify` — Verify email OTP

### Notes (requires auth)
- `GET    /api/notes` — List user's notes
- `POST   /api/notes` — Create note
- `GET    /api/notes/:id` — Get one note (owner only)
- `PUT    /api/notes/:id` — Update note (owner only)
- `DELETE /api/notes/:id` — Delete note (owner only)

### Admin (requires ADMIN role)
- `GET    /api/admin/users` — List all users
- `PUT    /api/admin/users/:id/role` — Change user role
- `DELETE /api/admin/users/:id` — Delete user
- `GET    /api/admin/notes` — List all notes (any user)

---

## 👨‍💻 Author

**Osama** ([@9i0s](https://github.com/9i0s))

Built for the Web Programming course — May 2026.

---

## 📜 License

MIT
