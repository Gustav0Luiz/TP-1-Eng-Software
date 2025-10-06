'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { User, LogIn, Menu, X, LogOut } from 'lucide-react';
import { useAuth } from '@/lib/auth'; // use alias "@/lib/auth" para evitar caminhos relativos quebradiços

/**
 * Header
 * - Logo + nome (linka para "/")
 * - Ações (Login/Registrar) OU saudação + Sair quando autenticado
 * - Menu mobile colapsável
 */
export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, logout, loading } = useAuth();

  // ref para devolver o foco ao botão quando o menu fecha
  const menuButtonRef = useRef<HTMLButtonElement | null>(null);

  // fecha o menu ao pressionar ESC
  useEffect(() => {
    if (!isMenuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsMenuOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isMenuOpen]);

  // quando o menu for fechado, devolve o foco ao botão (melhor navegação por teclado)
  useEffect(() => {
    if (!isMenuOpen && menuButtonRef.current) {
      menuButtonRef.current.focus();
    }
  }, [isMenuOpen]);

  // helper: fecha o menu e (opcionalmente) executa uma ação (ex.: logout)
  const closeMenu = (action?: () => void) => () => {
    setIsMenuOpen(false);
    if (action) action();
  };

  return (
    <header className="bg-white border-b border-blue-100">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Barra principal */}
        <div className="flex h-16 items-center justify-between">
          {/* Logo + Nome (link para a home) */}
          <Link href="/" className="flex cursor-pointer items-center space-x-2">
            {/* Use "priority" na home para evitar CLS do logo */}
            <Image
              src="/bookIcon.png"
              alt="Logo Vlib"
              width={27}
              height={27}
              priority
            />
            <span className="font-serif text-2xl font-bold text-blue-900">
              Vlib
            </span>
          </Link>

          {/* Ações em desktop (>= md) */}
          <nav
            className="hidden items-center space-x-4 md:flex"
            aria-label="Ações do usuário"
          >
            {loading ? (
              <div
                aria-live="polite"
                className="flex items-center space-x-2 px-4 py-2 text-gray-500"
              >
                <span>Carregando...</span>
              </div>
            ) : user ? (
              <div className="cursor-pointer flex items-center space-x-4">
                {/* Ícone de perfil e nome do usuário com redirecionamento */}
                <Link
                  href={`/user/${user.nickname}`}
                  className="flex items-center space-x-2 text-blue-900 hover:text-blue-700"
                >
                  <User className="h-5 w-5" />
                  <span>{user.first_name} {user.last_name}</span>
                </Link>
                <button
                  onClick={logout}
                  className="cursor-pointer flex items-center space-x-2 rounded-lg px-4 py-2 font-serif text-red-600 transition-colors hover:text-red-800"
                >
                  <LogOut className="h-4 w-4" aria-hidden="true" />
                  <span>Sair</span>
                </button>
              </div>
            ) : (
              <>
                <Link
                  href="/registrar"
                  className="flex items-center space-x-2 rounded-lg px-4 py-2 font-serif text-blue-700 transition-colors hover:text-blue-900"
                >
                  <User className="h-4 w-4" aria-hidden="true" />
                  <span>Registrar</span>
                </Link>
                <Link
                  href="/login"
                  className="flex items-center space-x-2 rounded-lg bg-blue-600 px-4 py-2 font-serif font-medium text-white transition-colors hover:bg-blue-700"
                >
                  <LogIn className="h-4 w-4" aria-hidden="true" />
                  <span>Login</span>
                </Link>
              </>
            )}
          </nav>

          {/* Botão do menu (mobile) */}
          <button
            ref={menuButtonRef}
            className="p-2 text-blue-600 transition-colors hover:text-blue-900 md:hidden"
            onClick={() => setIsMenuOpen((v) => !v)}
            aria-label={isMenuOpen ? 'Fechar menu' : 'Abrir menu'}
            aria-expanded={isMenuOpen}
            aria-controls="mobile-menu"
          >
            {isMenuOpen ? (
              <X className="h-6 w-6" aria-hidden="true" />
            ) : (
              <Menu className="h-6 w-6" aria-hidden="true" />
            )}
          </button>
        </div>

        {/* Drawer do mobile */}
        {isMenuOpen && (
          <div
            id="mobile-menu"
            className="md:hidden border-t border-blue-100 py-4"
            role="dialog"
            aria-modal="true"
          >
            <div className="flex flex-col space-y-3">
              {loading ? (
                <div
                  aria-live="polite"
                  className="flex items-center space-x-2 px-4 py-2 text-gray-500"
                >
                  <span>Carregando...</span>
                </div>
              ) : user ? (
                <>
                  <div className="px-4 py-2 font-serif text-blue-900">
                    Olá, {user.first_name}
                  </div>
                  <button
                    onClick={closeMenu(logout)}
                    className="flex items-center space-x-2 px-4 py-2 font-serif text-red-600 transition-colors hover:text-red-800"
                  >
                    <LogOut className="h-4 w-4" aria-hidden="true" />
                    <span>Sair</span>
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/registrar"
                    onClick={closeMenu()}
                    className="flex items-center space-x-2 rounded-md px-4 py-2 font-serif text-blue-700 transition-colors hover:bg-blue-50 hover:text-blue-900"
                  >
                    <User className="h-4 w-4" aria-hidden="true" />
                    <span>Registrar</span>
                  </Link>
                  <Link
                    href="/login"
                    onClick={closeMenu()}
                    className="flex items-center space-x-2 rounded-md bg-blue-600 px-4 py-2 font-serif text-white transition-colors hover:bg-blue-700"
                  >
                    <LogIn className="h-4 w-4" aria-hidden="true" />
                    <span>Login</span>
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
