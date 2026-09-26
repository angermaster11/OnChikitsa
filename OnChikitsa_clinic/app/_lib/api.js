'use client';

// Thin client for the OnChikitsa backend, authenticated with the clinic's
// Firebase ID token. Clinics never receive a backend JWT — the Firebase token is
// verified per-request by the backend (firebaseAuth). Envelopes are unwrapped to
// `data`; failures throw a typed ApiError so callers can branch on `.code`.
import { getIdToken } from './auth';

const BASE = (process.env.NEXT_PUBLIC_API_URL || '') + '/api/v1';

export class ApiError extends Error {
  constructor(code, message, status) {
    super(message || code || 'Request failed');
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
  }
  /** The post-OTP "clinic account doesn't exist yet" signal from GET /clinic/me. */
  get clinicNotFound() {
    return this.code === 'CLINIC_NOT_FOUND';
  }
}

async function request(path, { method = 'GET', body, auth = true } = {}) {
  const headers = {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true',
  };
  if (auth) {
    const token = await getIdToken();
    if (!token) throw new ApiError('NO_SESSION', 'You are not signed in.', 401);
    headers.Authorization = `Bearer ${token}`;
  }

  let res;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), 15000);
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new ApiError('NETWORK_TIMEOUT', 'Request timed out — please check your connection.', 0);
    }
    throw new ApiError('NETWORK', 'Network error — please check your connection.', 0);
  } finally {
    clearTimeout(id);
  }
  let json = null;
  try {
    json = await res.json();
  } catch {
    /* non-JSON response handled below */
  }

  if (!res.ok || !json || json.success === false) {
    const err = (json && json.error) || {};
    throw new ApiError(err.code || 'ERROR', err.message || `Request failed (${res.status})`, res.status);
  }
  return json.data;
}
// Short-lived in-memory cache for GET /clinic/me. Every protected screen's guard
// calls it, so navigating dashboard → settings → profile would otherwise fire
// several DB reads within a second. A tiny TTL collapses those into one
// round-trip; writes refresh it, sign-out clears it.
let _meCache = null; // { at: number, data }
const ME_TTL_MS = 10000;

/** Drop the cached profile (call on sign-out / account switch). */
export function invalidateMe() {
  _meCache = null;
}

export const clinicApi = {
  /**
   * GET /clinic/me — clinic profile, or 401 CLINIC_NOT_FOUND if no account
   * exists yet (post-OTP, pre-registration). Served from the TTL cache unless
   * `force` is true. Errors are never cached.
   */
  getMe: async (force = false) => {
    if (!force && _meCache && Date.now() - _meCache.at < ME_TTL_MS) return _meCache.data;
    const data = await request('/clinic/me');
    _meCache = { at: Date.now(), data };
    return data;
  },
  /** POST /clinic/register — create the clinic profile after phone verification. */
  register: async (payload) => {
    const data = await request('/clinic/register', { method: 'POST', body: payload });
    _meCache = { at: Date.now(), data }; // the created doc is the fresh profile
    return data;
  },
  /** PATCH /clinic/me — edit profile fields (settings / photo urls / status). */
  updateMe: async (payload) => {
    const data = await request('/clinic/me', { method: 'PATCH', body: payload });
    _meCache = { at: Date.now(), data }; // PATCH returns the updated doc
    return data;
  },
};

export const doctorApi = {
  /** GET /clinic/doctors — this clinic's doctors (returns the items array). */
  list: async () => request('/clinic/doctors?limit=100'),
  /** POST /clinic/doctors — add a doctor (photo optional). */
  create: async (payload) => request('/clinic/doctors', { method: 'POST', body: payload }),
  /** PATCH /clinic/doctors/:id — edit a doctor. */
  update: async (id, payload) => request(`/clinic/doctors/${id}`, { method: 'PATCH', body: payload }),
  /** DELETE /clinic/doctors/:id — soft-delete a doctor. */
  remove: async (id) => request(`/clinic/doctors/${id}`, { method: 'DELETE' }),
};
/**
 * Backend-signed direct upload to Cloudinary with a real progress bar.
 *
 * 1. Ask our backend to sign the upload (`POST /clinic/uploads/signature`). The
 *    API secret stays server-side; we receive `{ cloudName, apiKey, timestamp,
 *    signature, folder, uploadUrl }`. The folder is derived from the clinic id,
 *    so this REQUIRES an existing clinic account — during first-time
 *    registration, call this only AFTER clinicApi.register() has succeeded.
 * 2. Upload the file straight to Cloudinary via XHR so `upload.onprogress` can
 *    drive a progress indicator. FormData must contain EXACTLY the signed params
 *    (file, api_key, timestamp, signature, folder) or the signature won't match.
 *
 * @param {File|Blob} file      the image to upload
 * @param {'logo'|'banner'|'doctor'} kind  asset kind (scopes the folder)
 * @param {(pct:number)=>void} [onProgress] 0..100 upload percentage
 * @returns {Promise<string>} the Cloudinary secure_url
 */
export async function uploadToCloudinary(file, kind, onProgress) {
  const sig = await request('/clinic/uploads/signature', { method: 'POST', body: { kind } });
  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.append('file', file);
    form.append('api_key', sig.apiKey);
    form.append('timestamp', String(sig.timestamp));
    form.append('signature', sig.signature);
    form.append('folder', sig.folder);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', sig.uploadUrl);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && typeof onProgress === 'function') {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };
    xhr.onload = () => {
      let res = null;
      try { res = JSON.parse(xhr.responseText); } catch { /* handled below */ }
      if (xhr.status >= 200 && xhr.status < 300 && res && res.secure_url) {
        if (typeof onProgress === 'function') onProgress(100);
        resolve(res.secure_url);
      } else {
        const msg = (res && res.error && res.error.message) || 'Upload failed';
        reject(new ApiError('UPLOAD_FAILED', msg, xhr.status));
      }
    };
    xhr.onerror = () => reject(new ApiError('UPLOAD_FAILED', 'Upload failed — please check your connection.', 0));
    xhr.ontimeout = () => reject(new ApiError('UPLOAD_TIMEOUT', 'Upload timed out — please try again.', 0));
    xhr.timeout = 60000;
    xhr.send(form);
  });
}
