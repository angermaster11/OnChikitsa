import crypto from 'node:crypto';
import { env } from './env';

/**
 * Backend-signed direct upload. The API secret NEVER leaves the server: instead
 * of proxying image bytes through the backend, we hand the client a signature
 * over the exact upload params it will send, so the browser/app uploads the file
 * straight to Cloudinary (giving a real upload-progress bar) while we keep the
 * secret. Cloudinary's signature scheme is SHA-1 over the alphabetically-sorted
 * `key=value` params (excluding file / api_key / cloud_name / resource_type),
 * with the API secret appended.
 */
export interface CloudinarySignature {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  folder: string;
  uploadUrl: string;
}

/** True when the three Cloudinary credentials are present in the environment. */
export function isCloudinaryConfigured(): boolean {
  return env.cloudinaryConfigured;
}

function signParams(params: Record<string, string | number>, apiSecret: string): string {
  const toSign = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join('&');
  return crypto.createHash('sha1').update(toSign + apiSecret).digest('hex');
}

/**
 * Produce a signature + the params the client must echo back to Cloudinary.
 * `folder` is the only signed param besides `timestamp`; keep the client's
 * FormData limited to exactly `{ file, api_key, timestamp, signature, folder }`
 * or the signature will not match.
 */
export function signUpload(params: { folder: string }): CloudinarySignature {
  if (!env.cloudinaryConfigured) {
    throw new Error('Cloudinary is not configured');
  }
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = signParams({ folder: params.folder, timestamp }, env.CLOUDINARY_API_SECRET!);
  return {
    cloudName: env.CLOUDINARY_CLOUD_NAME!,
    apiKey: env.CLOUDINARY_API_KEY!,
    timestamp,
    signature,
    folder: params.folder,
    // `auto` lets Cloudinary detect image vs. other; resource_type is not signed.
    uploadUrl: `https://api.cloudinary.com/v1_1/${env.CLOUDINARY_CLOUD_NAME}/auto/upload`,
  };
}
