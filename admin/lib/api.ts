/**
 * Typed fetch client for the OnChikitsa backend.
 *
 * Responsibilities:
 *  - Prepend the API base (`${NEXT_PUBLIC_API_URL}/api/v1`).
 *  - Attach the in-memory Bearer access token.
 *  - Parse the standard response envelope and throw a typed {@link ApiError}
 *    whenever `success` is false.
 *  - On a 401, attempt a single silent refresh via `/admin/refresh` (using the
 *    refresh token persisted in localStorage), then retry the request once.
 *    If refresh fails, the session is cleared and the browser is sent to /login.
 *
 * Token storage strategy: the access token lives only in memory (module scope);
 * the refresh token is persisted in localStorage so a page reload can silently
 * re-establish a session. See lib/auth.tsx.
 */
import type { ApiEnvelope, AuthTokens, Paginated } from './types';

const REFRESH_TOKEN_KEY = 'onchikitsa_admin_refresh_token';

function getApiBase(): string {
  const url = process.env.NEXT_PUBLIC_API_URL;
  if (!url) {
    throw new Error('NEXT_PUBLIC_API_URL is not configured');
  }
  return `${url.replace(/\/$/, '')}/api/v1`;
}

// ── Token store ────────────────────────────────────────────────────────────
let accessToken: string | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}
export function getAccessToken(): string | null {
  return accessToken;
}
export function getRefreshToken(): string | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage.getItem(REFRESH_TOKEN_KEY);
  } catch {
    return null;
  }
}
export function setRefreshToken(token: string | null): void {
  try {
    if (typeof window === 'undefined') return;
    if (token) window.localStorage.setItem(REFRESH_TOKEN_KEY, token);
    else window.localStorage.removeItem(REFRESH_TOKEN_KEY);
  } catch {
    /* localStorage unavailable — access token in memory still works for the session */
  }
}
export function setTokens(tokens: AuthTokens): void {
  setAccessToken(tokens.accessToken);
  setRefreshToken(tokens.refreshToken);
}
export function clearSession(): void {
  setAccessToken(null);
  setRefreshToken(null);
}

// ── Typed error ──────────────────────────────────────────────────────────
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }

  /** True when the failure is an authorization (403) error. */
  get isForbidden(): boolean {
    return this.status === 403;
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined | null>;
  /** Set false to skip attaching the access token / refresh-retry (auth calls). */
  auth?: boolean;
  signal?: AbortSignal;
}

function buildUrl(path: string, query?: RequestOptions['query']): string {
  const url = new URL(`${getApiBase()}${path}`);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value));
      }
    }
  }
  return url.toString();
}

function baseHeaders(withBody: boolean): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    // The API is exposed through an ngrok tunnel in this environment; this
    // header skips ngrok's HTML browser-warning interstitial for fetch calls.
    'ngrok-skip-browser-warning': 'true',
  };
  if (withBody) headers['Content-Type'] = 'application/json';
  return headers;
}

// ── Refresh handling (single-flight) ───────────────────────────────────────
let refreshInFlight: Promise<boolean> | null = null;

async function performRefresh(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;
  try {
    const res = await fetch(buildUrl('/admin/refresh'), {
      method: 'POST',
      headers: baseHeaders(true),
      body: JSON.stringify({ refreshToken }),
    });
    const json = (await res.json()) as ApiEnvelope<AuthTokens>;
    if (!res.ok || !json.success || !('data' in json)) return false;
    const data = json.data as AuthTokens;
    setTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken });
    return true;
  } catch {
    return false;
  }
}

function tryRefresh(): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = performRefresh().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

function redirectToLogin(): void {
  if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
    window.location.assign('/login');
  }
}

async function rawFetch(path: string, options: RequestOptions, isRetry: boolean): Promise<Response> {
  const useAuth = options.auth !== false;
  const withBody = options.body !== undefined;
  const headers = baseHeaders(withBody);
  if (useAuth && accessToken) headers.Authorization = `Bearer ${accessToken}`;

  const res = await fetch(buildUrl(path, options.query), {
    method: options.method ?? 'GET',
    headers,
    body: withBody ? JSON.stringify(options.body) : undefined,
    signal: options.signal,
  });

  if (res.status === 401 && useAuth && !isRetry) {
    const refreshed = await tryRefresh();
    if (refreshed) return rawFetch(path, options, true);
    clearSession();
    redirectToLogin();
  }
  return res;
}

async function parseEnvelope<T>(res: Response): Promise<ApiEnvelope<T>> {
  const text = await res.text();
  if (!text) {
    if (res.ok) return { success: true, data: null as unknown as T };
    throw new ApiError(res.status, 'INTERNAL_ERROR', res.statusText || 'Request failed');
  }
  try {
    return JSON.parse(text) as ApiEnvelope<T>;
  } catch {
    throw new ApiError(res.status, 'INTERNAL_ERROR', 'Unexpected non-JSON response from server');
  }
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<ApiEnvelope<T>> {
  const res = await rawFetch(path, options, false);
  const json = await parseEnvelope<T>(res);
  if (!json.success) {
    const err = json.error;
    throw new ApiError(res.status, err.code, err.message, err.details);
  }
  return json;
}

// ── Public helpers ──────────────────────────────────────────────────────
export const api = {
  async get<T>(path: string, options: Omit<RequestOptions, 'method' | 'body'> = {}): Promise<T> {
    const env = (await request<T>(path, { ...options, method: 'GET' })) as { data: T };
    return env.data;
  },
  async getList<T>(path: string, options: Omit<RequestOptions, 'method' | 'body'> = {}): Promise<Paginated<T>> {
    const env = await request<T>(path, { ...options, method: 'GET' });
    if (!('pagination' in env)) {
      // Non-paginated payload — normalise to an empty page.
      return { data: [], pagination: { page: 1, limit: 0, total: 0, totalPages: 0 } };
    }
    return { data: env.data, pagination: env.pagination };
  },
  async post<T>(path: string, body?: unknown, options: Omit<RequestOptions, 'method'> = {}): Promise<T> {
    const env = (await request<T>(path, { ...options, method: 'POST', body })) as { data: T };
    return env.data;
  },
  async patch<T>(path: string, body?: unknown, options: Omit<RequestOptions, 'method'> = {}): Promise<T> {
    const env = (await request<T>(path, { ...options, method: 'PATCH', body })) as { data: T };
    return env.data;
  },
  async del<T>(path: string, options: Omit<RequestOptions, 'method' | 'body'> = {}): Promise<T> {
    const env = (await request<T>(path, { ...options, method: 'DELETE' })) as { data: T };
    return env.data;
  },
};

/** Extract a user-facing message from any thrown value. */
export function errorMessage(err: unknown, fallback = 'Something went wrong'): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  return fallback;
}
