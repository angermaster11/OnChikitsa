# OnChikitsa Backend

Production-grade REST API for the OnChikitsa healthcare platform — patient (USER) and clinic onboarding, staff administration, moderation (ban/unban), immutable audit logging, and an admin dashboard.

Built with **Node.js + TypeScript + Express + MongoDB (Mongoose)** following SOLID and a clean, layered modular architecture. Authorization is enforced entirely on the backend; the frontend is never trusted.

---

## Table of contents

- [Tech stack](#tech-stack)
- [Architecture](#architecture)
- [Directory layout](#directory-layout)
- [Authentication model](#authentication-model)
- [Authorization (RBAC)](#authorization-rbac)
- [Audit logging](#audit-logging)
- [Getting started](#getting-started)
- [Environment variables](#environment-variables)
- [NPM scripts](#npm-scripts)
- [API surface](#api-surface)
- [Security measures](#security-measures)
- [Testing](#testing)
- [Documented design decisions](#documented-design-decisions)
- [Further docs](#further-docs)

---

## Tech stack

| Concern            | Choice                                             |
| ------------------ | -------------------------------------------------- |
| Language           | TypeScript (compiled to CommonJS, target ES2022)   |
| HTTP framework     | Express 4                                          |
| Database           | MongoDB via Mongoose 8                              |
| Validation         | Zod (every request body/query/param)               |
| Staff auth         | JWT access + rotating refresh tokens               |
| App auth           | Firebase Admin SDK (phone-OTP ID token verify)     |
| Password hashing   | Argon2id (`@node-rs/argon2`)                        |
| App logging        | Pino (+ pino-http), redacted                        |
| Audit logging      | MongoDB (immutable collection)                     |
| Security           | helmet, CORS, express-rate-limit, body size limits |
| Tests              | Jest + supertest + mongodb-memory-server           |

---

## Architecture

The codebase is **layered per module** so responsibilities stay isolated and each
piece is independently testable:

```
route  →  middleware (auth / authorize / validate)  →  controller  →  service  →  repository  →  model
```

- **routes** — declare paths + attach middleware only. No logic.
- **controllers** — thin: read the request, call a service, format the response envelope. No business logic, no DB access.
- **services** — all business rules, authorization decisions, transactions, and audit writes.
- **repositories** — all Mongoose queries (filters, pagination, projections).
- **models** — schema, indexes, invariants (e.g. audit-log immutability hooks).

Cross-cutting concerns live in dedicated folders: `config/` (env, db, logger, firebase),
`middleware/` (auth, authorize, validate, rate-limit, error handling, request logging),
`rbac/` (permission catalogue + role map), `utils/` (errors, response envelopes,
pagination, constants), and `types/` (Express request augmentation, auth types).

Adding a future module (appointments, payments, notifications…) means dropping a new
folder under `src/modules/` with the same six files and mounting its router in
`src/routes/index.ts` — nothing else changes.

---

## Directory layout

```
backend/
├── src/
│   ├── app.ts                 # Express app assembly (no side effects)
│   ├── server.ts              # Entry point: connect DB, listen, graceful shutdown
│   ├── config/                # env, database, logger, firebase
│   ├── middleware/            # adminAuth, firebaseAuth, authorize, validate, rateLimiter, errorHandler, requestLogger
│   ├── rbac/                  # permissions.ts (catalogue + role→permission map)
│   ├── routes/index.ts        # mounts every module router under /api/v1
│   ├── scripts/               # bootstrapSuperAdmin.ts (secure seed)
│   ├── types/                 # express.d.ts, auth.ts
│   ├── utils/                 # errors, response, pagination, constants, validators, ...
│   └── modules/
│       ├── auth/              # staff login/refresh/logout/me (JWT)
│       ├── admins/            # staff (ADMIN/SUPPORT) management
│       ├── users/             # patient management + self-service
│       ├── clinics/           # clinic management + self-service
│       ├── doctors/           # doctor management (admin) + clinic-owned CRUD
│       ├── support/           # support tickets
│       ├── audit/             # read-only audit log endpoints
│       └── dashboard/         # aggregate stats
├── tests/                     # jest + supertest integration & unit tests
├── .env.example
└── README.md
```

---

## Authentication model

Two distinct authentication schemes, because the platform serves two very different
audiences:

**1. Staff (SUPER_ADMIN / ADMIN / SUPPORT) — backend-issued JWT**
- Login with email + password (Argon2id verified).
- Server issues a short-lived **access token** (15m) and a long-lived **refresh token** (7d).
- Refresh tokens are **rotated** on every use and stored only as SHA-256 hashes in the
  `refreshtokens` collection (revocation + reuse detection). A TTL index expires them.
- `adminAuth` middleware verifies the access token **and re-loads the Admin from the DB on
  every request**, so a disabled account is rejected immediately (not only when its token expires).

**2. App users (USER / CLINIC) — Firebase phone-OTP**
- The mobile apps authenticate the phone number with Firebase and send the Firebase **ID token**.
- `firebaseAuth('USER'|'CLINIC')` verifies the token server-side via the Firebase Admin SDK
  (`checkRevoked: true`), loads the matching record by `firebaseUid`, and **enforces DB status**
  (BANNED → 403, DELETED → 403) — a banned user is blocked even if Firebase still considers them valid.
- `firebaseIdentity(role)` verifies the token **without** requiring an existing record; used only for
  first-time registration.

> The backend **never trusts** `req.body.userId`, `firebaseUid`, `role`, or `status`. Identity always
> comes from a verified token; status always comes from the database.

---

## Authorization (RBAC)

Authorization is **permission-based, never role-string based**. Roles are simply bundles of
permissions defined in [`src/rbac/permissions.ts`](src/rbac/permissions.ts).

- `authorize(PERMISSION_A, PERMISSION_B)` middleware requires the actor to hold **all** listed
  permissions, else responds **403**.
- `SUPER_ADMIN` implicitly holds every permission.
- `ADMIN` gets user/clinic moderation + doctor view + audit + dashboard by default.
- `SUPPORT` gets read-only visibility by default.
- Any individual staff account may carry an **explicit permission override** array for
  least-privilege customisation (e.g. grant one Support user `USER_BAN` without making them an Admin).

Security-critical, role-specific rules (e.g. "an Admin may create SUPPORT but not ADMIN", "nobody may
create or modify a SUPER_ADMIN via the API", "you cannot disable your own account") are enforced in the
**service layer** on top of the coarse route permission — see [`admins/admin.service.ts`](src/modules/admins/admin.service.ts).

## Audit logging

Audit logging (**who did what**) is separate from application logging (**Pino**, for errors/perf).
Every sensitive action writes an immutable record to the `auditlogs` collection capturing the **actor
identity and role** — so the log reads *"Admin Rahul banned user Arjun"*, never *"a user was banned"*.

Immutability is enforced two ways:
1. There is **no** update or delete audit endpoint. The audit module is read-only (list + get by id).
2. Model-level Mongoose hooks reject every `updateOne/updateMany/findOneAndUpdate/deleteOne/deleteMany/findOneAndDelete`
   as defence-in-depth.

Ban/unban write their audit record **inside the same transaction** as the status change, so the two can
never diverge (with graceful fallback on standalone MongoDB — see design decisions).

---

## Getting started

### Prerequisites
- Node.js 18+ (20 LTS recommended)
- A MongoDB instance (local `mongod`, Docker, or Atlas)
- (Optional) A Firebase project + service account, if you want to exercise USER/CLINIC endpoints locally

### Install & run

```bash
cd backend
npm install
cp .env.example .env          # then edit secrets
npm run seed:superadmin       # create the Super Admin from SUPER_ADMIN_* env vars
npm run dev                   # tsx watch on http://localhost:5000
```

Health check: `GET http://localhost:5000/health`

### Production build

```bash
npm run build                 # tsc → dist/
npm start                     # node dist/server.js
```

## Environment variables

See [`.env.example`](.env.example) for the annotated template. The process **refuses to boot**
(fails fast) if required variables are missing or malformed.

| Variable | Required | Notes |
| --- | --- | --- |
| `MONGODB_URI` | ✅ | Connection string. Replica set enables transactions. |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | ✅ | ≥16 chars; use `openssl rand -hex 32`. |
| `ACCESS_TOKEN_EXPIRES_IN` / `REFRESH_TOKEN_EXPIRES_IN` | | Default `15m` / `7d`. |
| `SUPER_ADMIN_EMAIL` / `SUPER_ADMIN_PASSWORD` / `SUPER_ADMIN_NAME` | seed | Used by `seed:superadmin`. Password is hashed. |
| `FIREBASE_PROJECT_ID` / `FIREBASE_CLIENT_EMAIL` / `FIREBASE_PRIVATE_KEY` | app auth | Optional locally; USER/CLINIC endpoints need them. |
| `CORS_ORIGIN` | | Comma-separated origins or `*`. |
| `MAX_LOGIN_ATTEMPTS` / `LOGIN_LOCK_MINUTES` | | Account lockout tuning (default 5 / 15). |
| `BODY_LIMIT` | | JSON body size cap (default `1mb`). |
| `LOG_LEVEL` | | Pino level (default `info`). |
| `PORT` | | Default `5000` (kept for the monorepo dev contract). |

## NPM scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Hot-reloading dev server (`tsx watch`). |
| `npm run build` | Type-check + compile to `dist/`. |
| `npm start` | Run the compiled server. |
| `npm run typecheck` | `tsc --noEmit` (no output). |
| `npm run seed:superadmin` | Idempotently create the Super Admin from env. |
| `npm test` | Jest suite against an in-memory MongoDB. |

---

## API surface

All endpoints are versioned under **`/api/v1`** and return a standard envelope:

```jsonc
// success
{ "success": true, "data": { /* ... */ }, "message": "..." }
// paginated
{ "success": true, "data": [ /* ... */ ], "pagination": { "page": 1, "limit": 20, "total": 42, "totalPages": 3 } }
// error
{ "success": false, "error": { "code": "FORBIDDEN", "message": "...", "details": { /* optional */ } } }
```

| Mount | Audience | Auth |
| --- | --- | --- |
| `POST /admin/login`, `/admin/refresh`, `/admin/logout`, `GET /admin/me` | Staff | JWT |
| `/admin/dashboard/stats` | Staff | JWT + `DASHBOARD_VIEW` |
| `/admin/users` | Staff | JWT + `USER_*` |
| `/admin/clinics` | Staff | JWT + `CLINIC_*` |
| `/admin/doctors` | Staff | JWT + `DOCTOR_*` |
| `/admin/admins` | Staff | JWT + `ADMIN_VIEW` (+ service-level checks) |
| `/admin/support` | Staff | JWT + `SUPPORT_VIEW` |
| `/admin/audit-logs` | Staff | JWT + `AUDIT_LOG_VIEW` |
| `/user`, `/user/support` | Patients | Firebase (USER) |
| `/clinic`, `/clinic/doctors`, `/clinic/support` | Clinics | Firebase (CLINIC) |

Full request/response details are in [`docs/API.md`](docs/API.md).

## Security measures

- **Passwords**: Argon2id, `select:false` hash column, never logged, never returned.
- **No hardcoded credentials**: Super Admin is seeded from env; `.env` is git-ignored.
- **Backend-enforced authorization**: every protected route checks permissions server-side (403 on failure); frontend permissions are advisory only.
- **DB status enforcement**: banned/deleted/disabled accounts are rejected on every request via a fresh DB read, not cached token claims.
- **Immutable audit trail**: append-only, no mutate/delete path.
- **Transport & payload hardening**: helmet, configurable CORS, global + login rate limiting, JSON body size cap.
- **Refresh-token rotation** with hashed storage and reuse revocation.
- **No leaked internals**: the error handler maps known errors to safe codes and never returns stack traces or raw DB errors in production.
- **Redacted logs**: Pino redacts authorization headers, passwords, tokens, and the Firebase private key.

## Testing

```bash
npm test
```

Tests run against an ephemeral **mongodb-memory-server** (no external DB needed). Coverage includes:
- Permission resolution and role bundles.
- Argon2id hashing/verification.
- Audit-log immutability (update/delete rejected).
- Staff login + JWT/refresh flow, lockout, and `/admin/me`.
- RBAC 401/403 enforcement (app roles cannot reach admin APIs; Support cannot create an Admin; nobody creates a Super Admin).
- Ban → the banned account is blocked from protected APIs; every ban/unban is audited.
- DB-level pagination bounds and Zod validation failures.

---

## Documented design decisions

These are the non-obvious calls made where the spec left room, recorded so future maintainers
understand the *why*:

1. **`@node-rs/argon2` over `argon2`** — the pure-Rust binding avoids `node-gyp`/native build
   failures across environments while giving identical Argon2id security. Parameters
   (19 MiB memory, 2 iterations) are a sensible production baseline; tune to hardware.

2. **Transactions with graceful standalone fallback** — ban/unban wrap the status change and the
   audit write in a single transaction so they can't diverge. A standalone `mongod` does not support
   multi-document transactions, so `runInTransaction` detects the topology and, when transactions are
   unavailable, runs the same work without a session. For strict atomicity in production, run MongoDB
   as a replica set (even a single-node RS enables transactions).

3. **Firebase initialised lazily and guarded** — the server boots without Firebase credentials so
   staff/admin work is possible in local dev; USER/CLINIC endpoints then return a clear auth error
   instead of crashing the process at startup.

4. **`SUPPORT` is a staff role, not a separate collection** — SUPER_ADMIN, ADMIN and SUPPORT all live
   in the `admins` collection distinguished by `role`, keeping staff auth and management uniform.

5. **DB status re-checked every request** — tokens are not trusted for authorization state. A disabled
   admin or banned user is blocked the instant the DB says so, closing the "valid token, revoked
   account" gap.

6. **`doctorsCount` computed via one aggregation per page** — the clinic list enriches each row with its
   active-doctor count using a single grouped aggregation over the page's clinic ids (no N+1 queries).

7. **PORT defaults to 5000 and `/health` is preserved** — the surrounding monorepo dev tooling expects
   the backend on port 5000 with a `/health` probe; both are kept as a hard contract.

## Further docs

- [`docs/API.md`](docs/API.md) — endpoint reference (methods, params, permissions, examples).
- [`docs/DATABASE.md`](docs/DATABASE.md) — collections, schemas, and index strategy.
- [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) — production deployment & hardening checklist.

