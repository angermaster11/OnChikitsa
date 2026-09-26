'use client';

/**
 * Authentication context for the admin panel.
 *
 * Holds the authenticated actor + effective permissions in React state. Tokens
 * are managed by lib/api.ts: the access token stays in memory, the refresh token
 * is persisted to localStorage. On first mount the provider tries to rehydrate a
 * session by refreshing (if a refresh token exists) and loading /admin/me.
 *
 * `hasPermission` is a COSMETIC helper only — it hides/disables UI controls for a
 * cleaner UX. It is NOT a security boundary: the backend authorizes every request
 * independently and returns 403 regardless of what the UI shows.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  api,
  clearSession,
  getRefreshToken,
  setAccessToken,
  setTokens,
} from './api';
import type { Actor, LoginData, Permission } from './types';

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

interface AuthContextValue {
  actor: Actor | null;
  status: AuthStatus;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  hasPermission: (perm: Permission) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [actor, setActor] = useState<Actor | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');

  // Attempt to rehydrate a session on first load.
  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      if (!getRefreshToken()) {
        if (!cancelled) setStatus('unauthenticated');
        return;
      }
      try {
        // A protected call triggers the api client's silent refresh, which mints
        // a fresh access token from the stored refresh token.
        const me = await api.get<Actor>('/admin/me');
        if (cancelled) return;
        setActor(me);
        setStatus('authenticated');
      } catch {
        if (cancelled) return;
        clearSession();
        setActor(null);
        setStatus('unauthenticated');
      }
    }

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const data = await api.post<LoginData>('/admin/login', { email, password }, { auth: false });
    // Tokens are TOP-LEVEL fields of `data` (no `data.tokens` wrapper).
    setTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken });
    setActor({
      id: data.admin.id,
      name: data.admin.name,
      email: data.admin.email,
      role: data.admin.role,
      permissions: data.permissions,
    });
    setStatus('authenticated');
  }, []);

  const logout = useCallback(async () => {
    const refreshToken = getRefreshToken();
    try {
      if (refreshToken) {
        await api.post('/admin/logout', { refreshToken });
      }
    } catch {
      /* best-effort — logout is idempotent on the server */
    } finally {
      clearSession();
      setAccessToken(null);
      setActor(null);
      setStatus('unauthenticated');
    }
  }, []);

  const hasPermission = useCallback(
    (perm: Permission) => actor?.permissions.includes(perm) ?? false,
    [actor],
  );

  const value = useMemo<AuthContextValue>(
    () => ({ actor, status, login, logout, hasPermission }),
    [actor, status, login, logout, hasPermission],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an <AuthProvider>');
  return ctx;
}
