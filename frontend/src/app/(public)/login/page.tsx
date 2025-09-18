// src/app/(public)/login/page.tsx
'use client';

import { LogIn, Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import Footer from '@/app/components/Footer';

/**
 * Página de Login
 * - Autentica por nickname + password
 * - Em caso de sucesso → redireciona para /user/[nickname]
 */
export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [nickname, setNickname] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const router = useRouter();

  const normalizeNickname = (s: string) =>
    s.toLowerCase().trim().replace(/\s+/g, '').replace(/[^\w.-]/g, '');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!nickname.trim()) {
      setError('Informe seu nome de usuário.');
      return;
    }
    if (!password) {
      setError('Informe sua senha.');
      return;
    }

    setLoading(true);
    try {
      // chama backend → POST /auth/login
      await login(nickname.trim().toLowerCase(), password);

      // redireciona para rota dinâmica: /user/[nickname]
      router.push(`/user/${normalizeNickname(nickname)}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao fazer login';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white font-serif">
      {/* Header */}
      <header className="bg-white border-b border-blue-100">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center space-x-2">
            <Image src="/bookIcon.png" alt="Logo Vlib" width={27} height={27} />
            <span className="text-2xl font-serif font-bold text-blue-900">Vlib</span>
          </Link>
        </div>
      </header>

      {/* Card de login */}
      <main className="mx-auto max-w-md px-4 py-12 sm:py-20">
        <div className="rounded-2xl bg-white p-8 shadow-xl">
          <div className="mb-8 text-center">
            <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
              <LogIn className="h-8 w-8 text-blue-600" />
            </div>
            <h1 className="font-serif text-3xl font-bold text-blue-900">Entrar</h1>
            <p className="font-serif mt-2 text-gray-600">Acesse sua conta na Vlib</p>
          </div>

          {error && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4">
              <p className="font-serif text-sm text-red-600">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6" noValidate>
            {/* Nickname */}
            <div>
              <label htmlFor="nickname" className="mb-2 block text-sm font-medium text-gray-700 font-serif">
                Nome de usuário
              </label>
              <input
                id="nickname"
                type="text"
                autoComplete="username"
                value={nickname}
                onChange={(e) => setNickname(normalizeNickname(e.target.value))}
                required
                className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-transparent focus:ring-2 focus:ring-blue-500 font-serif"
                placeholder="ex.: mariazinha"
              />
            </div>

            {/* Senha */}
            <div>
              <label htmlFor="password" className="mb-2 block text-sm font-medium text-gray-700 font-serif">
                Senha
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 pr-12 outline-none focus:border-transparent focus:ring-2 focus:ring-blue-500 font-serif"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 flex items-center pr-4"
                  onClick={() => setShowPassword((s) => !s)}
                >
                  {showPassword ? <EyeOff className="h-5 w-5 text-gray-400" /> : <Eye className="h-5 w-5 text-gray-400" />}
                </button>
              </div>
            </div>

            {/* Botão */}
            <button
              type="submit"
              disabled={loading}
              className="cursor-pointer flex w-full items-center justify-center space-x-2 rounded-xl bg-blue-600 px-4 py-3 text-white transition-colors hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 font-serif disabled:cursor-not-allowed disabled:opacity-50"
            >
              <LogIn className="h-5 w-5" />
              <span>{loading ? 'Entrando...' : 'Entrar'}</span>
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link href="/registrar" className="font-serif text-sm text-blue-600 transition-colors hover:text-blue-900">
              Não tem conta? Registre-se
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
