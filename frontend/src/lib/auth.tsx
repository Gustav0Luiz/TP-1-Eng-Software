'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

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

  useEffect(() => {
    // Verifica se há token e dados do usuário salvos no localStorage
    const savedToken = localStorage.getItem('auth_token');
    const savedUser = localStorage.getItem('auth_user');
    
    if (savedToken && savedUser) {
      try {
        const userData = JSON.parse(savedUser);
        setToken(savedToken);
        setUser(userData);
        setLoading(false);
        
        // Verifica se o token ainda é válido em background (sem bloquear a UI)
        validateTokenInBackground(savedToken);
      } catch (error) {
        console.error('Erro ao parsear dados do usuário salvos:', error);
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        setLoading(false);
      }
    } else if (savedToken) {
      setToken(savedToken);
      // Se só tem token mas não tem dados do usuário, busca os dados
      fetchUserData(savedToken);
    } else {
      setLoading(false);
    }
  }, []);

  const fetchUserData = async (authToken: string) => {
    try {
      const response = await fetch('http://localhost:4000/api/me', {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        // Salva os dados do usuário no localStorage
        localStorage.setItem('auth_user', JSON.stringify(data.user));
      } else {
        // Token inválido, remove do localStorage
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        setToken(null);
        setUser(null);
      }
    } catch (error) {
      console.error('Erro ao buscar dados do usuário:', error);
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const validateTokenInBackground = async (authToken: string) => {
    try {
      const response = await fetch('http://localhost:4000/api/me', {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        // Token inválido, remove tudo e desloga o usuário
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        setToken(null);
        setUser(null);
      }
    } catch (error) {
      console.error('Erro ao validar token em background:', error);
      // Em caso de erro de rede, mantém o usuário logado mas pode tentar novamente depois
    }
  };

  const login = async (email: string, password: string) => {
    const response = await fetch('http://localhost:4000/api/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Erro ao fazer login');
    }

    // Salva o token no localStorage
    localStorage.setItem('auth_token', data.token);
    localStorage.setItem('auth_user', JSON.stringify(data.user));
    
    // Configura o cookie com o token
    document.cookie = `auth_token=${data.token}; path=/; max-age=604800; samesite=lax`; // 7 dias
    
    // Atualiza o estado
    setUser(data.user);
    setToken(data.token);
  };

  const register = async (firstName: string, lastName: string, nickname: string, email: string, password: string) => {
    const response = await fetch('http://localhost:4000/api/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ first_name: firstName, last_name: lastName, nickname, email, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Erro ao registrar usuário');
    }

    // Salva o token no localStorage
    localStorage.setItem('auth_token', data.token);
    localStorage.setItem('auth_user', JSON.stringify(data.user));
    
    // Configura o cookie com o token
    document.cookie = `auth_token=${data.token}; path=/; max-age=604800; samesite=lax`; // 7 dias
    
    // Atualiza o estado
    setUser(data.user);
    setToken(data.token);
  };

  const logout = () => {
    // Remove dos cookies
    document.cookie = 'auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    
    // Remove do localStorage
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    
    // Atualiza o estado
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
