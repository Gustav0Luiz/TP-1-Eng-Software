// src/app/(public)/registrar/page.tsx
'use client';

/**
 * Página de Registro
 * - Campos: first_name, last_name, nickname, email, password, confirmPassword
 * - Validação básica client-side (o backend valida novamente)
 * - Chama useAuth.register({ first_name, last_name, nickname, email, password })
 * - Em caso de sucesso, redireciona para "/"
 */

import { UserPlus, Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import Footer from '@/app/components/Footer';

export default function Registrar() {
  // visibilidade dos campos de senha
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // campos do formulário
  const [firstName, setFirstName] = useState('');
  const [lastName,  setLastName]  = useState('');
  const [nickname,  setNickname]  = useState('');
  const [email,     setEmail]     = useState('');
  const [password,  setPassword]  = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // UX
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);

  const { register } = useAuth();
  const router = useRouter();

  // validação simples de email (client-side)
  const isEmailValid = (e: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());

  // dica de normalização para nickname (somente client-side/UX)
  const normalizeNickname = (s: string) =>
    s
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '')           // remove espaços
      .replace(/[^\w.-]/g, '');      // mantém letras/números/_ . -

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // validações mínimas no client (o backend também valida)
    if (!firstName.trim()) return setError('Informe seu nome.');
    if (!lastName.trim())  return setError('Informe seu sobrenome.');
    if (!nickname.trim())  return setError('Informe um nome de usuário.');
    if (!isEmailValid(email)) return setError('Informe um e-mail válido.');
    if (password.length < 6) return setError('A senha deve ter pelo menos 6 caracteres.');
    if (password !== confirmPassword) return setError('As senhas não coincidem.');

    setLoading(true);
    try {
      const user = await register({
        first_name: firstName, 
        last_name: lastName,    
        nickname: nickname,     
        email: email,          
        password: password,
      });
      // redireciona para /<nickname>
      router.push(`/user/${user.nickname}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao registrar usuário');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white font-serif">
      {/* Header mínimo (marca) */}
      <header className="bg-white border-b border-blue-100">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center space-x-2">
            <Image src="/bookIcon.png" alt="Logo Vlib" width={27} height={27} />
            <span className="text-2xl font-serif font-bold text-blue-900">Vlib</span>
          </Link>
        </div>
      </header>

      {/* Card de registro */}
      <main className="mx-auto max-w-md px-4 py-12 sm:py-20">
        <div className="rounded-2xl bg-white p-8 shadow-xl">
          <div className="mb-8 text-center">
            <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
              <UserPlus className="h-8 w-8 text-blue-600" />
            </div>
            <h1 className="font-serif text-3xl font-bold text-blue-900">Criar conta</h1>
            <p className="font-serif mt-2 text-gray-600">
              Preencha seus dados para acessar a Vlib
            </p>
          </div>

          {/* Erros globais */}
          {error && (
            <div
              className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4"
              role="alert"
              aria-live="polite"
            >
              <p className="font-serif text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Formulário */}
          <form onSubmit={handleSubmit} className="space-y-6" noValidate>
            {/* Nome + Sobrenome (lado a lado em ≥ sm) */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="firstName"
                  className="font-serif mb-2 block text-sm font-medium text-gray-700"
                >
                  Nome
                </label>
                <input
                  id="firstName"
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                  autoComplete="given-name"
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-transparent focus:ring-2 focus:ring-blue-500 font-serif"
                  placeholder="Seu nome"
                />
              </div>

              <div>
                <label
                  htmlFor="lastName"
                  className="font-serif mb-2 block text-sm font-medium text-gray-700"
                >
                  Sobrenome
                </label>
                <input
                  id="lastName"
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                  autoComplete="family-name"
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-transparent focus:ring-2 focus:ring-blue-500 font-serif"
                  placeholder="Seu sobrenome"
                />
              </div>
            </div>

            {/* Nome de usuário (único) */}
            <div>
              <label
                htmlFor="nickname"
                className="font-serif mb-2 block text-sm font-medium text-gray-700"
              >
                Nome de usuário
              </label>
              <input
                id="nickname"
                type="text"
                value={nickname}
                onChange={(e) => setNickname(normalizeNickname(e.target.value))}
                required
                autoComplete="username"
                className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-transparent focus:ring-2 focus:ring-blue-500 font-serif"
                placeholder="ex.: mariazinha"
              />
              <p className="mt-2 text-xs text-gray-500">
                Use apenas letras, números, ponto (.) e hífen (-). Deve ser único.
              </p>
            </div>

            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="font-serif mb-2 block text-sm font-medium text-gray-700"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-transparent focus:ring-2 focus:ring-blue-500 font-serif"
                placeholder="seu@email.com"
              />
            </div>

            {/* Senha */}
            <div>
              <label
                htmlFor="password"
                className="font-serif mb-2 block text-sm font-medium text-gray-700"
              >
                Senha
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 pr-12 outline-none focus:border-transparent focus:ring-2 focus:ring-blue-500 font-serif"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  className="absolute inset-y-0 right-0 flex items-center pr-4"
                  onClick={() => setShowPassword((s) => !s)}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
              <p className="mt-2 text-xs text-gray-500">Mínimo de 6 caracteres.</p>
            </div>

            {/* Confirmar Senha */}
            <div>
              <label
                htmlFor="confirmPassword"
                className="font-serif mb-2 block text-sm font-medium text-gray-700"
              >
                Confirmar senha
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 pr-12 outline-none focus:border-transparent focus:ring-2 focus:ring-blue-500 font-serif"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  aria-label={showConfirmPassword ? 'Ocultar confirmação de senha' : 'Mostrar confirmação de senha'}
                  className="absolute inset-y-0 right-0 flex items-center pr-4"
                  onClick={() => setShowConfirmPassword((s) => !s)}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
            </div>

            {/* Termos */}
            <div className="flex items-start">
              <input
                id="terms"
                type="checkbox"
                required
                className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="terms" className="ml-2 text-sm text-gray-600 font-serif">
                Aceito os{' '}
                <Link href="/termos" className="text-blue-600 hover:text-blue-800">
                  termos de uso
                </Link>{' '}
                e a{' '}
                <Link href="/politica-de-privacidade" className="text-blue-600 hover:text-blue-800">
                  política de privacidade
                </Link>
                .
              </label>
            </div>

            {/* Botão enviar */}
            <button
              type="submit"
              disabled={loading}
              className="cursor-pointer flex w-full items-center justify-center space-x-2 rounded-xl bg-blue-600 px-4 py-3 text-white transition-colors hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 font-serif disabled:cursor-not-allowed disabled:opacity-50"
            >
              <UserPlus className="h-5 w-5" />
              <span>{loading ? 'Criando conta...' : 'Criar conta'}</span>
            </button>
          </form>

          {/* Link para login */}
          <div className="mt-6 text-center">
            <Link
              href="/login"
              className="font-serif text-sm text-blue-600 transition-colors hover:text-blue-900"
            >
              Já tem conta? Faça login
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
