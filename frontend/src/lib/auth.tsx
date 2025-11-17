// src/lib/auth.tsx
'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export interface User {
  id: number;
  first_name: string;
  last_name: string;
  nickname: string;   // <— importante
  email: string;
}

type RegisterPayload = {
  first_name: string;
  last_name: string;
  nickname: string;
  email: string;
  password: string;
};

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (nickname: string, password: string) => Promise<User>;         // ← retorna User
  register: (payload: RegisterPayload) => Promise<User>;                // ← retorna User
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function safeSetToken(t: string | null, maxAgeSeconds = 60 * 60 * 24 * 7) {
  if (typeof window !== 'undefined') {
    if (t) localStorage.setItem('auth_token', t);
    else localStorage.removeItem('auth_token');

    if (t) {
      document.cookie = `auth_token=${t}; path=/; max-age=${maxAgeSeconds}; sameSite=lax`;
    } else {
      document.cookie = 'auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; sameSite=lax';
    }
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    if (saved) {
      setToken(saved);
      fetchUserData(saved).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const fetchUserData = async (authToken: string) => {
    try {
      const res = await fetch(`${BASE_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${authToken}` },
        cache: 'no-store',
      });
      if (!res.ok) {
        safeSetToken(null);
        setToken(null);
        setUser(null);
        return;
      }
      const data = await res.json();
      setUser(data.user as User);
    } catch {
      safeSetToken(null);
      setToken(null);
      setUser(null);
    }
  };

  const login = async (nickname: string, password: string): Promise<User> => {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nickname, password }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data?.error?.message || 'Erro ao fazer login');
    }
    const { user: u, token: t } = data as { user: User; token: string };
    setUser(u);
    setToken(t);
    safeSetToken(t);
    return u; // ← devolve o usuário autenticado
  };

  const register = async (payload: RegisterPayload): Promise<User> => {
    const res = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data?.error?.message || 'Erro ao registrar usuário');
    }
    const { user: u, token: t } = data as { user: User; token: string };
    setUser(u);
    setToken(t);
    safeSetToken(t);
    return u; // ← devolve o usuário criado
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    safeSetToken(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
