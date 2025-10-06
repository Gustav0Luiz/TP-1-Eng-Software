'use client';

import { Search, Bell, ArrowRight, BookOpen, FileText, Download, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Header from './components/Header';
import Footer from './components/Footer';

export default function Home() {
  const router = useRouter();

  // mantém a search bar exatamente como está
  const [query, setQuery] = useState('');
  const [searchBy, setSearchBy] = useState('title');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/buscar?q=${encodeURIComponent(query)}&field=${searchBy}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <Header />

      {/* BG decorativo sutil */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-indigo-200/40 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-blue-200/40 blur-3xl" />
      </div>

      <main className="max-w-7xl min-h-[85vh] mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20">
        <div className="text-center">
          {/* HERO */}

          <h1 className="mt-4 text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-blue-900">
            Busque, explore e acompanhe
          </h1>
          <p className="mt-4 text-lg sm:text-xl leading-relaxed text-gray-600 max-w-3xl mx-auto">
            Encontre publicações por título, autor ou evento e acesse os PDFs com facilidade. 
            Ative alertas por e-mail para ser avisado quando novos trabalhos forem adicionados.
          </p>

          {/* Barra de busca (inalterada) */}
          <div className="mt-8 max-w-4xl mx-auto px-2 sm:px-0">
            <form
              onSubmit={handleSearch}
              method="GET"
              className="relative flex flex-col sm:flex-row gap-2 sm:gap-0"
              aria-label="Formulário de busca por artigos"
            >
              <div className="relative flex-1">
                <label htmlFor="search-q" className="sr-only">
                  Busca por artigos, autores, palavras-chave
                </label>
                <div className="absolute inset-y-0 left-0 pl-3 sm:pl-4 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                </div>
                <input
                  id="search-q"
                  type="text"
                  name="q"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar artigos, autores, palavras-chave..."
                  className="w-full pl-10 sm:pl-12 pr-3 sm:pr-4 py-3 sm:py-4 text-base sm:text-lg border border-gray-300 rounded-xl sm:rounded-r-none focus:ring-2 outline-none focus:ring-blue-500 focus:border-transparent shadow-lg"
                  required
                  autoComplete="off"
                />
              </div>

              <select
                name="field"
                value={searchBy}
                onChange={(e) => setSearchBy(e.target.value)}
                className="outline-none cursor-pointer hover:bg-blue-700 transition-colors bg-blue-600 text-white border border-none p-2 sm:p-3"
              >
                <option value="title">Título</option>
                <option value="author">Autor</option>
                <option value="event">Evento</option>
              </select>

              <button
                type="submit"
                className="cursor-pointer px-4 sm:px-6 py-3 sm:py-4 bg-blue-600 text-white rounded-xl sm:rounded-l-none hover:bg-blue-700 transition-colors text-base sm:text-lg"
                aria-label="Buscar"
              >
                Buscar
              </button>
            </form>
          </div>

          {/* CTA mais discreto */}
          <div className="mt-8 sm:mt-10">
            <Link
              href="/alertas"
              className="group inline-flex items-center gap-2 rounded-xl bg-white text-indigo-700 ring-1 ring-inset ring-indigo-200 px-5 py-3 font-semibold shadow-sm hover:bg-indigo-50 transition"
            >
              <Bell className="h-5 w-5 group-hover:animate-pulse" />
              Ativar alertas por autor
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <p className="mt-3 text-sm text-gray-600">
              Receba um e-mail sempre que um novo artigo for cadastrado com o seu nome como autor.
            </p>
          </div>

          {/* Features */}
          <div className="mt-12 sm:mt-16 grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8 max-w-4xl mx-auto">
            <div className="group rounded-2xl border border-gray-200 bg-white/70 p-6 shadow-sm backdrop-blur transition hover:shadow-md">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 group-hover:scale-105 transition">
                <BookOpen className="h-6 w-6 text-blue-700" />
              </div>
              <h3 className="mt-4 text-base font-semibold text-blue-900">Busca precisa</h3>
              <p className="mt-1 text-sm text-gray-600">
                Encontre rapidamente por título, autor ou evento, com resultados organizados por ano.
              </p>
            </div>

            <div className="group rounded-2xl border border-gray-200 bg-white/70 p-6 shadow-sm backdrop-blur transition hover:shadow-md">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 group-hover:scale-105 transition">
                <FileText className="h-6 w-6 text-blue-700" />
              </div>
              <h3 className="mt-4 text-base font-semibold text-blue-900">Cadastro ágil</h3>
              <p className="mt-1 text-sm text-gray-600">
                Inclua artigos manualmente ou importe em massa via BibTeX com PDFs zipados.
              </p>
            </div>

            <div className="group rounded-2xl border border-gray-200 bg-white/70 p-6 shadow-sm backdrop-blur transition hover:shadow-md">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 group-hover:scale-105 transition">
                <Download className="h-6 w-6 text-blue-700" />
              </div>
              <h3 className="mt-4 text-base font-semibold text-blue-900">Acesso ao PDF</h3>
              <p className="mt-1 text-sm text-gray-600">
                Visualize ou baixe o PDF com poucos cliques, direto nos resultados.
              </p>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
