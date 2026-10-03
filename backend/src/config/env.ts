import 'dotenv/config';
import path from 'node:path';
import dotenv from 'dotenv';
import { z } from 'zod';

// Load the shared monorepo root .env first (single source of truth), then the
// backend-local .env which can override for backend-only secrets.
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

/**
 * Environment schema. The process refuses to boot if required variables are
 * missing or malformed — fail fast rather than at first request.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(5000),

  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
  // The database inside the cluster this app owns. Kept separate from other
  // projects sharing the same cluster (e.g. `rangamai`) so collections never
  // collide. Overrides any db in MONGODB_URI's path — see config/database.ts.
  MONGODB_DB_NAME: z.string().min(1).default('onchikitsa'),
  // Connection-pool bounds PER PROCESS. Sized so (pool × instances) stays under
  // the cluster's connection cap when running multiple replicas behind an LB.
  MONGODB_MAX_POOL_SIZE: z.coerce.number().int().positive().default(50),
  MONGODB_MIN_POOL_SIZE: z.coerce.number().int().nonnegative().default(5),

  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 chars'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 chars'),
  ACCESS_TOKEN_EXPIRES_IN: z.string().default('15m'),
  REFRESH_TOKEN_EXPIRES_IN: z.string().default('7d'),

  // Firebase is optional locally so the server can boot for admin-only work.
  FIREBASE_PROJECT_ID: z.string().optional(),
  FIREBASE_CLIENT_EMAIL: z.string().optional(),
  FIREBASE_PRIVATE_KEY: z.string().optional(),

  // Cloudinary (image uploads) — optional so the server boots without it; the
  // signed-upload endpoint returns 503 until these are set. Either provide the
  // three discrete vars or a single CLOUDINARY_URL (cloudinary://key:secret@name).
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  CLOUDINARY_URL: z.string().optional(),

  // Razorpay (the app's payment gateway) — optional so the server boots without
  // it; the payment endpoints return 503 until KEY_ID + KEY_SECRET are set.
  // Mirrors the Cloudinary optional-service pattern. WEBHOOK_SECRET is the value
  // configured on the Razorpay webhook and is used to verify inbound signatures
  // (checked separately by the webhook route, so it is not part of the gate).
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),

  // Absolute base the gateway + in-app browser reach us at (webhook target, and
  // the web checkout return). Prefer PUBLIC_BASE_URL, then the shared ngrok tunnel.
  PUBLIC_BASE_URL: z.string().optional(),
  NGROK_URL: z.string().optional(),

  SUPER_ADMIN_EMAIL: z.string().email().optional(),
  SUPER_ADMIN_PASSWORD: z.string().min(8).optional(),
  SUPER_ADMIN_NAME: z.string().default('Super Admin'),

  CORS_ORIGIN: z.string().default('*'),
  // Express `trust proxy` setting. Default '1' = trust one proxy hop. Set to the
  // REAL number of proxies in front of the app in production (e.g. '2'), or 'false'
  // when there is no proxy, so a client can't spoof X-Forwarded-For to defeat the
  // IP-keyed rate limiter. Accepts a number, 'true'/'false', or a subnet string.
  TRUST_PROXY: z.string().default('1'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  MAX_LOGIN_ATTEMPTS: z.coerce.number().int().positive().default(5),
  LOGIN_LOCK_MINUTES: z.coerce.number().int().positive().default(15),
  BODY_LIMIT: z.string().default('1mb'),

  // Optional Redis. When set, the rate limiter uses a shared Redis store so the
  // limit is correct across multiple instances behind a load balancer. When unset
  // (e.g. local dev), everything falls back to in-process state — nothing breaks.
  REDIS_URL: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // Do NOT use the pino logger here — it may depend on env. Print & exit.
  // eslint-disable-next-line no-console
  console.error('❌ Invalid environment configuration:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

const raw = parsed.data;

// Cloudinary credentials may arrive either as three discrete vars or bundled in
// a single CLOUDINARY_URL. The discrete vars win when both are present.
function parseCloudinaryUrl(url?: string) {
  if (!url) return {};
  const m = /^cloudinary:\/\/([^:]+):([^@]+)@(.+)$/.exec(url.trim());
  if (!m) return {};
  return { apiKey: m[1], apiSecret: m[2], cloudName: m[3] };
}
const cld = parseCloudinaryUrl(raw.CLOUDINARY_URL);
const CLOUDINARY_CLOUD_NAME = raw.CLOUDINARY_CLOUD_NAME || cld.cloudName;
const CLOUDINARY_API_KEY = raw.CLOUDINARY_API_KEY || cld.apiKey;
const CLOUDINARY_API_SECRET = raw.CLOUDINARY_API_SECRET || cld.apiSecret;

/** Parse TRUST_PROXY into the value Express `set('trust proxy', …)` expects. */
function parseTrustProxy(v: string): boolean | number | string {
  if (v === 'true') return true;
  if (v === 'false') return false;
  const n = Number(v);
  if (Number.isInteger(n) && n >= 0) return n;
  return v; // subnet / IP list passed through to Express
}

export const env = {
  ...raw,
  isProd: raw.NODE_ENV === 'production',
  isTest: raw.NODE_ENV === 'test',
  // Firebase private keys are stored with escaped newlines in .env — restore them.
  FIREBASE_PRIVATE_KEY: raw.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  corsOrigins: raw.CORS_ORIGIN.split(',').map((o) => o.trim()).filter(Boolean),
  trustProxy: parseTrustProxy(raw.TRUST_PROXY),
  firebaseConfigured: Boolean(
    raw.FIREBASE_PROJECT_ID && raw.FIREBASE_CLIENT_EMAIL && raw.FIREBASE_PRIVATE_KEY,
  ),
  CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET,
  cloudinaryConfigured: Boolean(CLOUDINARY_CLOUD_NAME && CLOUDINARY_API_KEY && CLOUDINARY_API_SECRET),
  // Payments are available once both API keys are present. The webhook secret is
  // checked separately by the webhook route (a deployment may verify checkout
  // without yet wiring the webhook), so it is not part of this gate.
  razorpayConfigured: Boolean(raw.RAZORPAY_KEY_ID && raw.RAZORPAY_KEY_SECRET),
  // Whether a shared Redis store is available for the rate limiter (multi-instance).
  redisConfigured: Boolean(raw.REDIS_URL),
  // Absolute base the gateway + in-app browser use to reach our endpoints (webhook).
  // Prefer an explicit PUBLIC_BASE_URL, then the shared ngrok tunnel, then local.
  publicBaseUrl: (raw.PUBLIC_BASE_URL || raw.NGROK_URL || `http://localhost:${raw.PORT}`).replace(
    /\/+$/,
    '',
  ),
};

export type Env = typeof env;
