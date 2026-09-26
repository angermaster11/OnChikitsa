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

  JWT_ACCESS_SECRET: z.string().min(16, 'JWT_ACCESS_SECRET must be at least 16 chars'),
  JWT_REFRESH_SECRET: z.string().min(16, 'JWT_REFRESH_SECRET must be at least 16 chars'),
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

  SUPER_ADMIN_EMAIL: z.string().email().optional(),
  SUPER_ADMIN_PASSWORD: z.string().min(8).optional(),
  SUPER_ADMIN_NAME: z.string().default('Super Admin'),

  CORS_ORIGIN: z.string().default('*'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  MAX_LOGIN_ATTEMPTS: z.coerce.number().int().positive().default(5),
  LOGIN_LOCK_MINUTES: z.coerce.number().int().positive().default(15),
  BODY_LIMIT: z.string().default('1mb'),
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

export const env = {
  ...raw,
  isProd: raw.NODE_ENV === 'production',
  isTest: raw.NODE_ENV === 'test',
  // Firebase private keys are stored with escaped newlines in .env — restore them.
  FIREBASE_PRIVATE_KEY: raw.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  corsOrigins: raw.CORS_ORIGIN.split(',').map((o) => o.trim()).filter(Boolean),
  firebaseConfigured: Boolean(
    raw.FIREBASE_PROJECT_ID && raw.FIREBASE_CLIENT_EMAIL && raw.FIREBASE_PRIVATE_KEY,
  ),
  CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET,
  cloudinaryConfigured: Boolean(CLOUDINARY_CLOUD_NAME && CLOUDINARY_API_KEY && CLOUDINARY_API_SECRET),
};

export type Env = typeof env;
