# Deployment & Hardening

## Build artifact

```bash
npm ci
npm run build          # → dist/
node dist/server.js    # or: npm start
```

The app is a single stateless Node process. Run N replicas behind a load balancer; all shared state
lives in MongoDB.

## Required environment (production)

Set these as real secrets via your platform's secret manager (never in the image):

- `NODE_ENV=production`
- `MONGODB_URI` — **replica set** connection string (enables transactions for ban+audit atomicity)
- `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` — 32+ random bytes each, rotated periodically
- `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` — service account
- `CORS_ORIGIN` — explicit admin-panel / app origins (do **not** use `*` in production)
- `SUPER_ADMIN_*` — only needed to run the one-time seed

## First-run bootstrap

```bash
npm run seed:superadmin   # idempotent; creates the Super Admin from SUPER_ADMIN_* env
```

Rotate the seeded password after first login. The seed only ever creates one account and is safe to
re-run.

## Production checklist

- [ ] MongoDB is a replica set (transactions) with auth enabled and network-restricted.
- [ ] `autoIndex` is off in production (it is, via `NODE_ENV`); indexes built during deploy.
- [ ] `CORS_ORIGIN` restricted to known origins; TLS terminated at the proxy.
- [ ] Reverse proxy sets `X-Forwarded-*`; app has `trust proxy` enabled for correct client IPs.
- [ ] Rate-limit store swapped to Redis if running multiple instances (default is in-memory, per-process).
- [ ] Secrets injected from a vault, not baked into images or committed `.env`.
- [ ] Logs shipped to a central sink; `LOG_LEVEL=info` or higher.
- [ ] `/health` wired to the orchestrator's liveness/readiness probes.
- [ ] Regular MongoDB backups + audit-log retention policy defined.
- [ ] Graceful shutdown honoured (SIGTERM) — the orchestrator sends SIGTERM and waits before SIGKILL.

## Scaling notes

- **Stateless app** → horizontal scaling is trivial; sticky sessions are not required (JWT).
- **Rate limiting** is per-process in-memory by default; move to a shared store (Redis) for a true
  global limit across replicas.
- **Refresh tokens** are stored hashed with a TTL index; expired tokens are reaped automatically.
- New modules (appointments, payments, notifications) follow the same layered pattern and mount into
  `src/routes/index.ts` — no infrastructure changes needed.
