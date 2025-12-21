import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string | null;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
  signUp: (payload: { email: string; password: string; displayName?: string }) => Promise<void>;
  signIn: (payload: { email: string; password: string }) => Promise<void>;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function fetchJson(path: string, options: RequestInit = {}) {
  const res = await fetch(path, { ...options, credentials: 'include', headers: { 'Content-Type': 'application/json' } });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || 'Request failed');
  }
  return res.json();
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const signUp = useCallback(async ({ email, password, displayName }: { email: string; password: string; displayName?: string }) => {
    try {
      setError(null);
      const data = await fetchJson('/api/auth/register', { method: 'POST', body: JSON.stringify({ email, password, displayName }) });
      setUser(data.user);
    } catch (err: any) {
      setError(err?.message || 'Unable to sign up');
      throw err;
    }
  }, []);

  const signIn = useCallback(async ({ email, password }: { email: string; password: string }) => {
    try {
      setError(null);
      const data = await fetchJson('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
      setUser(data.user);
    } catch (err: any) {
      setError(err?.message || 'Unable to sign in');
      throw err;
    }
  }, []);

  const refresh = useCallback(async () => {
    setError(null);
    const data = await fetchJson('/api/auth/refresh', { method: 'POST' });
    setUser(data.user);
  }, []);

  const signOut = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    setUser(null);
  }, []);

  useEffect(() => {
    const boot = async () => {
      try {
        const res = await fetch('/api/auth/me', { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
        }
      } catch (err) {
        // ignore
      } finally {
        setLoading(false);
      }
    };
    void boot();
  }, []);

  useEffect(() => {
    if (!user) return;
    const id = window.setInterval(() => {
      void refresh().catch(() => null);
    }, 10 * 60 * 1000);
    return () => window.clearInterval(id);
  }, [user, refresh]);

  const value = useMemo(() => ({ user, loading, error, signUp, signIn, refresh, signOut }), [user, loading, error, signUp, signIn, refresh, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
