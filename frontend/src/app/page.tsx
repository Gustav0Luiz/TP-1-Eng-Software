'use client';

import { Search } from 'lucide-react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from './components/Header';
import Footer from './components/Footer';

export default function Home() {
  const router = useRouter();
  
  // Estados para armazenar a pesquisa e o filtro selecionado (Título, Autor ou Evento)
  const [query, setQuery] = useState('');
  const [searchBy, setSearchBy] = useState('title'); // Default é 'title'

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      // Redireciona para a página de resultados de busca com a query e o filtro
      router.push(`/buscar?q=${query}&field=${searchBy}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white font-serif">
      {/* Header fixado no topo */}
      <Header />

      <main className="max-w-7xl min-h-[85vh] mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20">
        <div className="text-center">
          {/* Título principal responsivo */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-blue-900 mb-6">
            Biblioteca Virtual de
            <span className="block text-blue-600">Artigos Científicos</span>
          </h1>

          {/* Subtítulo/descrição curta */}
          <p className="text-lg sm:text-xl text-gray-600 mb-8 sm:mb-12 max-w-3xl mx-auto font-serif">
            Descubra, explore e acesse milhares de artigos científicos de alta qualidade.
            Sua pesquisa acadêmica começa aqui.
          </p>

          {/* Barra de busca */}
          <div className="max-w-4xl mx-auto px-2 sm:px-0">
            <form
              onSubmit={handleSearch}
              method="GET"
              className="relative flex flex-col sm:flex-row gap-2 sm:gap-0"
              aria-label="Formulário de busca por artigos"
            >
              <div className="relative flex-1">
                {/* Label oculto para leitores de tela */}
                <label htmlFor="search-q" className="sr-only">
                  Busca por artigos, autores, palavras-chave
                </label>

                {/* Ícone de busca embutido no input */}
                <div className="absolute inset-y-0 left-0 pl-3 sm:pl-4 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                </div>

                {/* Campo de busca */}
                <input
                  id="search-q"
                  type="text"
                  name="q"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar artigos, autores, palavras-chave..."
                  className="w-full pl-10 sm:pl-12 pr-3 sm:pr-4 py-3 sm:py-4 text-base sm:text-lg border border-gray-300 rounded-xl sm:rounded-r-none focus:ring-2 outline-none focus:ring-blue-500 focus:border-transparent shadow-lg font-serif"
                  required
                  autoComplete="off"
                />
              </div>

              {/* Dropdown para selecionar o campo de pesquisa */}
              <select
                name="field"
                value={searchBy}
                onChange={(e) => setSearchBy(e.target.value)}
                className="outline-none cursor-pointer hover:bg-blue-700 transition-colors bg-blue-600 text-white border border-none p-2 sm:p-3 "
              >
                <option value="title">Título</option>
                <option value="author">Autor</option>
                <option value="event">Evento</option>
              </select>

              {/* Botão de submit */}
              <button
                type="submit"
                className="cursor-pointer px-4 sm:px-6 py-3 sm:py-4 bg-blue-600 text-white rounded-xl sm:rounded-l-none hover:bg-blue-700 transition-colors font-serif text-base sm:text-lg"
                aria-label="Buscar"
              >
                Buscar
              </button>
            </form>
          </div>

          {/* Métricas rápidas (estáticas por enquanto; podem vir do backend depois) */}
          <div className="mt-12 sm:mt-16 grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8 max-w-2xl mx-auto">
            <div className="text-center">
              <div className="text-2xl sm:text-3xl font-bold text-blue-600 font-serif">10K+</div>
              <div className="text-gray-600 font-serif">Artigos</div>
            </div>
            <div className="text-center">
              <div className="text-2xl sm:text-3xl font-bold text-blue-600 font-serif">500+</div>
              <div className="text-gray-600 font-serif">Autores</div>
            </div>
            <div className="text-center">
              <div className="text-2xl sm:text-3xl font-bold text-blue-600 font-serif">50+</div>
              <div className="text-gray-600 font-serif">Áreas</div>
            </div>
          </div>
        </div>
      </main>

      {/* Rodapé fixado na parte inferior */}
      <Footer />
    </div>
  );
}
