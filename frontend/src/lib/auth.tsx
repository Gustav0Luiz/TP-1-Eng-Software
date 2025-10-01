'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiRequest } from './api';

interface User {
  id: number;
  first_name: string;
  last_name: string;
  nickname: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (firstName: string, lastName: string, nickname: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserData = async (authToken: string) => {
    try {
      const data = await apiRequest('/api/me', {
        headers: { 'Authorization': `Bearer ${authToken}` },
      });
      setUser(data.user);
      localStorage.setItem('auth_user', JSON.stringify(data.user));
    } catch (error) {
      console.error('Erro ao buscar dados do usuário:', error);
      logout(); // Desloga o usuário se o token for inválido
    } finally {
      setLoading(false);
    }
  };

  const validateTokenInBackground = async (authToken: string) => {
    try {
      await apiRequest('/api/me', {
        headers: { 'Authorization': `Bearer ${authToken}` },
      });
    } catch (error) {
      console.error('Erro ao validar token em background:', error);
      logout(); // Desloga se o token for inválido
    }
  };

  useEffect(() => {
    const savedToken = localStorage.getItem('auth_token');
    const savedUser = localStorage.getItem('auth_user');
    
    if (savedToken && savedUser) {
      try {
        const userData = JSON.parse(savedUser);
        setToken(savedToken);
        setUser(userData);
        validateTokenInBackground(savedToken);
      } catch (error) {
        console.error('Erro ao parsear dados do usuário salvos:', error);
        logout();
      }
    } else if (savedToken) {
      fetchUserData(savedToken);
    } 
    setLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    const data = await apiRequest('/api/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    localStorage.setItem('auth_token', data.token);
    localStorage.setItem('auth_user', JSON.stringify(data.user));
    document.cookie = `auth_token=${data.token}; path=/; max-age=604800; samesite=lax`;
    setUser(data.user);
    setToken(data.token);
  };

  const register = async (firstName: string, lastName: string, nickname: string, email: string, password: string) => {
    const data = await apiRequest('/api/register', {
      method: 'POST',
      body: JSON.stringify({ first_name: firstName, last_name: lastName, nickname, email, password }),
    });

    localStorage.setItem('auth_token', data.token);
    localStorage.setItem('auth_user', JSON.stringify(data.user));
    document.cookie = `auth_token=${data.token}; path=/; max-age=604800; samesite=lax`;
    setUser(data.user);
    setToken(data.token);
  };

  const logout = () => {
    document.cookie = 'auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    setUser(null);
    setToken(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
