// src/components/Footer.tsx
"use client";

import Image from "next/image";
import Link from "next/link";

/**
 * Footer
 * - Logo + marca (link para "/")
 * - Navegação secundária (Sobre, Contato, Política)
 * - Texto de direitos autorais com ano dinâmico
 *
 * Melhorias:
 *  - Acessibilidade: <nav aria-label="Rodapé">, foco visível em links
 *  - CLS: dimensões do <Image> definidas; evita layout shift
 *  - Responsivo: empilha no mobile e distribui em md+
 *  - UX: estados de hover/focus consistentes com Tailwind
 */
export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-12 border-t border-blue-100 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Grid responsiva: colunas em telas médias+; empilhado no mobile */}
        <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
          {/* Logo / Marca */}
          <Link
            href="/"
            className="flex cursor-pointer items-center space-x-2"
            aria-label="Ir para a página inicial"
          >
            {/* Definimos width/height para evitar CLS; 'priority' opcional aqui */}
            <Image
              src="/bookIcon.png"
              alt="Logo da Vlib"
              width={20}
              height={20}
              className="rounded"
            />
            <span className="font-serif text-md font-bold text-blue-900">
              Vlib
            </span>
          </Link>

          {/* Navegação secundária do rodapé */}
          <nav
            className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 font-serif text-sm text-gray-600"
            aria-label="Rodapé"
          >
            {/* 
              Dica: substitua href="/" pelos caminhos reais quando as páginas existirem.
              Adicionamos estilos de foco para acessibilidade (keyboard users).
            */}
            <Link
              href="#"
              className="rounded px-1 transition-colors hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            >
              Sobre
            </Link>

            <Link
              href="#"
              className="rounded px-1 transition-colors hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            >
              Contato
            </Link>

            <Link
              href="#"
              className="rounded px-1 transition-colors hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            >
              Política de Privacidade
            </Link>
          </nav>

          {/* Direitos autorais */}
          <p className="font-serif text-sm text-gray-500">
            © {year} Vlib. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}
