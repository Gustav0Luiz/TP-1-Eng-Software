'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation'; // Agora usamos useSearchParams
import Header from '../components/Header';
import Footer from '../components/Footer';

export default function Buscar() {
  const searchParams = useSearchParams(); // Acessa os parâmetros da URL
  const router = useRouter();
  
  // Captura os parâmetros de consulta
  const query = searchParams.get('q') || ''; // Captura o valor de 'q'
  const field = searchParams.get('field') || 'title'; // Captura o valor de 'field', default 'title'

  const [articles, setArticles] = useState<any[]>([]); // Artigos que vão ser exibidos

  useEffect(() => {
    if (!query) return; // Se não houver query, não faz a busca

    const fetchArticles = async () => {
      try {
        const res = await fetch(`/api/articles/search?field=${field}&q=${query}`);
        const data = await res.json();
        setArticles(data.articles || []); // Armazena os artigos retornados
      } catch (err) {
        console.error('Erro ao carregar artigos:', err);
      }
    };

    fetchArticles(); // Chama a API para pegar os artigos de acordo com a pesquisa
  }, [query, field]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white font-serif">
      <Header />
      <main className="min-h-screen ax-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20">
        <div className="text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-blue-900 mb-6">
            Resultados da Busca
          </h1>

          {/* Exibe os resultados da pesquisa */}
          <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {articles.length === 0 ? (
              <div className="col-span-full text-center text-gray-500">
                Nenhum artigo encontrado.
              </div>
            ) : (
              articles.map((article) => (
                <div
                  key={article.id}
                  className="p-4 bg-white shadow-md rounded-lg border border-gray-200"
                >
                  <h3 className="text-lg font-semibold text-blue-900">{article.title}</h3>
                  <p className="text-sm text-gray-600 mt-2">{article.abstract}</p>
                  <div className="mt-4">
                    <a href={`/artigos/${article.id}`} className="text-blue-600 hover:text-blue-800">
                      Ver mais
                    </a>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
