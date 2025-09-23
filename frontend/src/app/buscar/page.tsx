'use client';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

import { useEffect, useState, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Header from '../components/Header';
import Footer from '../components/Footer';

type ArticleSearchItem = {
  id: number;
  title: string;
  abstract?: string | null;
  authors?: string[];
  edition_year?: number | null;
  event?: { name?: string | null };
  start_page?: number | null;
  end_page?: number | null;
};

export default function Buscar() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const query = searchParams.get('q') || '';
  const field = (searchParams.get('field') || 'title') as 'title' | 'author' | 'event';

  const [articles, setArticles] = useState<ArticleSearchItem[]>([]);
  const [loading, setLoading] = useState(false);

  const subtitle = useMemo(() => {
    const label =
      field === 'author' ? 'autor'
      : field === 'event' ? 'evento'
      : 'título';
    return query ? `Filtrando por ${label}: “${query}”` : 'Digite algo para buscar';
  }, [field, query]);

  useEffect(() => {
    if (!query) {
      setArticles([]);
      return;
    }

    const fetchArticles = async () => {
      try {
        setLoading(true);
        const res = await fetch(
          `${BASE_URL}/articles/search?field=${field}&q=${encodeURIComponent(query)}`
        );
        const data = await res.json();
        setArticles(Array.isArray(data?.articles) ? data.articles : []);
      } catch (err) {
        console.error('Erro ao carregar artigos:', err);
        setArticles([]);
      } finally {
        setLoading(false);
      }
    };

    fetchArticles();
  }, [query, field]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white font-serif">
      <Header />
      <main className="min-h-screen max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20">
        <div className="text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-blue-900 mb-2">
            Resultados da Busca
          </h1>
          <p className="text-gray-600">{subtitle}</p>
        </div>

        {/* Resultados */}
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {loading ? (
            <div className="col-span-full text-center text-gray-500">Carregando…</div>
          ) : articles.length === 0 ? (
            <div className="col-span-full text-center text-gray-500">
              Nenhum artigo encontrado.
            </div>
          ) : (
            articles.map((article) => {
              const authorLine = (article.authors && article.authors.length > 0)
                ? article.authors.join(', ')
                : 'Autor(es) não informados';

              const metaLineParts: string[] = [];
              if (article.event?.name) metaLineParts.push(article.event.name);
              if (article.edition_year != null) metaLineParts.push(String(article.edition_year));
              if (article.start_page != null && article.end_page != null) {
                metaLineParts.push(`pp. ${article.start_page}–${article.end_page}`);
              }
              const metaLine = metaLineParts.join(' • ');

              return (
                <div
                  key={article.id}
                  className="p-4 bg-white shadow-md rounded-lg border border-gray-200"
                >
                  <h3 className="text-lg font-semibold text-blue-900 line-clamp-2">
                    {article.title}
                  </h3>

                  {/* Autores */}
                  <p className="mt-2 text-sm text-gray-800">
                    <span className="font-medium">Autores: </span>
                    {authorLine}
                  </p>

                  {/* Meta (evento/ano/páginas) */}
                  {metaLine && (
                    <p className="mt-1 text-xs text-gray-500">{metaLine}</p>
                  )}

                  {/* Abstract, se existir */}
                  {article.abstract && (
                    <p className="text-sm text-gray-600 mt-3 line-clamp-4">
                      {article.abstract}
                    </p>
                  )}

                  <div className="mt-4">
                    <a
                      href={`/artigos/${article.id}`}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      Ver mais
                    </a>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
