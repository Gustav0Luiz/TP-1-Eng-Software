'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Search, Download } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

/** Tipos de dados (compatíveis com o backend) */
type ArticleDisplay = {
  id: number;
  title: string;
  abstract: string;
  event_name?: string;
  edition_year?: number;
  authors?: string[];
  start_page?: number | null;
  end_page?: number | null;
  created_at: string;
};

type FetchState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'done'; data: ArticleDisplay[] };

/** Mini util para legenda do filtro */
const labelByField: Record<string, string> = {
  title: 'Título',
  author: 'Autor',
  event: 'Evento',
};

/** Modal de detalhes — com Evento/Edição clicáveis */
function ArticleDetailModal({
  article,
  onClose,
}: {
  article: ArticleDisplay | null;
  onClose: () => void;
}) {
  if (!article) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* Cabeçalho com gradiente sutil */}
        <div className="border-b bg-gradient-to-r from-blue-50 to-white px-6 py-6">
          <h3 className="text-2xl font-bold leading-snug text-blue-900">Detalhes do Artigo</h3>
          <p className="mt-1 text-sm text-gray-500">
            Informações completas do registro selecionado
          </p>
        </div>

        {/* Corpo com linhas rotuladas */}
        <div className="px-6 py-6">
          <dl className="divide-y divide-gray-100 rounded-xl border border-gray-100 bg-white">

            {/* Nome do artigo */}
            <div className="grid grid-cols-1 gap-1 px-4 py-3 sm:grid-cols-12 sm:gap-4">
              <dt className="sm:col-span-3 text-sm font-semibold text-gray-600">Nome do artigo</dt>
              <dd className="sm:col-span-9 text-sm text-gray-800">{article.title || '—'}</dd>
            </div>

            {/* Autores */}
            <div className="grid grid-cols-1 gap-1 px-4 py-3 sm:grid-cols-12 sm:gap-4">
              <dt className="sm:col-span-3 text-sm font-semibold text-gray-600">Autores</dt>
              <dd className="sm:col-span-9 text-sm text-gray-800">
                {article.authors?.join(', ') || '—'}
              </dd>
            </div>

            {/* Evento (linkável) */}
            <div className="grid grid-cols-1 gap-1 px-4 py-3 sm:grid-cols-12 sm:gap-4">
              <dt className="sm:col-span-3 text-sm font-semibold text-gray-600">Evento</dt>
              <dd className="sm:col-span-9 text-sm">
                {article.event_name ? (
                  <Link
                    href={`/${article.event_name}`} // sem encodeURIComponent
                    className="font-medium text-blue-700 hover:underline"
                  >
                    {article.event_name}
                  </Link>
                ) : (
                  <span className="text-gray-800">—</span>
                )}
              </dd>
            </div>

            {/* Edição (ano linkável) */}
            <div className="grid grid-cols-1 gap-1 px-4 py-3 sm:grid-cols-12 sm:gap-4">
              <dt className="sm:col-span-3 text-sm font-semibold text-gray-600">Edição</dt>
              <dd className="sm:col-span-9 text-sm">
                {article.event_name && article.edition_year ? (
                  <Link
                    href={`/${article.event_name}/${article.edition_year}`} // sem encodeURIComponent
                    className="inline-flex items-center rounded-full border border-blue-200 px-2 py-0.5 font-medium text-blue-700 hover:bg-blue-50"
                  >
                    {article.edition_year}
                  </Link>
                ) : (
                  <span className="text-gray-800">—</span>
                )}
              </dd>
            </div>

            {/* Páginas */}
            <div className="grid grid-cols-1 gap-1 px-4 py-3 sm:grid-cols-12 sm:gap-4">
              <dt className="sm:col-span-3 text-sm font-semibold text-gray-600">Páginas</dt>
              <dd className="sm:col-span-9 text-sm text-gray-800">
                {(article.start_page ?? '—')} – {(article.end_page ?? 'Fim')}
              </dd>
            </div>

            {/* Resumo */}
            <div className="grid grid-cols-1 gap-1 px-4 py-3 sm:grid-cols-12 sm:gap-4">
              <dt className="sm:col-span-3 text-sm font-semibold text-gray-600">Resumo</dt>
              <dd className="sm:col-span-9 text-sm text-gray-800 whitespace-pre-wrap">
                {article.abstract || 'Não disponível.'}
              </dd>
            </div>
          </dl>
        </div>

        {/* Rodapé */}
        <div className="flex flex-wrap items-center justify-end gap-3 border-t px-6 py-5">
          <button
            onClick={onClose}
            className="cursor-pointer rounded-lg bg-gray-100 px-4 py-2 text-gray-700 hover:bg-gray-200"
          >
            Fechar
          </button>
          <a
            href={`${BASE_URL}/articles/${article.id}/pdf`}
            download
            className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 cursor-pointer inline-flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Baixar PDF
          </a>
        </div>
      </div>
    </div>
  );
}


/** Card de resultado — agora com links de Evento e Edição */
function ResultCard({
  item,
  onOpen,
}: {
  item: ArticleDisplay;
  onOpen: () => void;
}) {
  const authors = item.authors?.join(', ') || 'Autores não informados';

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-blue-200 bg-white p-6 shadow-sm transition hover:shadow-md">
      {/* Conteúdo */}
      <div className="flex-1 text-center">
        <h3 className="line-clamp-2 text-base font-bold tracking-tight text-blue-900">
          {item.title}
        </h3>

        <p className="mt-2 text-xs text-gray-700">{authors}</p>

        {/* LINKS: Evento e Edição */}
        <div className="mt-2 flex items-center justify-center gap-2 text-xs">
          {item.event_name && (
            <Link
              href={`/${item.event_name}`} // sem encodeURIComponent
              className="font-medium text-blue-700 hover:underline"
            >
              {item.event_name}
            </Link>
          )}

          {item.event_name && item.edition_year ? (
            <>
              <span className="text-gray-300">•</span>
              <Link
                href={`/${item.event_name}/${item.edition_year}`} // sem encodeURIComponent
                className="inline-flex items-center rounded-full border border-blue-200 px-2 py-0.5 font-medium text-blue-700 hover:bg-blue-50"
              >
                {item.edition_year}
              </Link>
            </>
          ) : null}
        </div>
      </div>

      {/* Ação única */}
      <div className="mt-5">
        <button
          onClick={onOpen}
          className="w-full cursor-pointer rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
          aria-label="Ver detalhes do artigo"
        >
          Ver detalhes
        </button>
      </div>
    </div>
  );
}

export default function BuscarPage() {
  const router = useRouter();
  const sp = useSearchParams();

  const q = sp.get('q')?.toString() ?? '';
  const field = (sp.get('field')?.toString() ?? 'title').toLowerCase();

  const [query, setQuery] = useState(q);
  const [searchBy, setSearchBy] = useState<'title' | 'author' | 'event'>(
    (['title', 'author', 'event'].includes(field) ? field : 'title') as any
  );

  const [state, setState] = useState<FetchState>({ kind: 'idle' });
  const [selected, setSelected] = useState<ArticleDisplay | null>(null);

  // refetch quando q/field mudarem na URL
  useEffect(() => {
    const run = async () => {
      if (!q.trim()) {
        setState({ kind: 'done', data: [] });
        return;
      }
      setState({ kind: 'loading' });
      try {
        const res = await fetch(
          `${BASE_URL}/articles/search?field=${encodeURIComponent(
            searchBy
          )}&q=${encodeURIComponent(q)}`
        );
        const json = await res.json();
        const data: ArticleDisplay[] = json.articles ?? [];

        // Ordena por ano decrescente e, em empate, por id desc
        data.sort(
          (a, b) =>
            (b.edition_year ?? 0) - (a.edition_year ?? 0) || b.id - a.id
        );
        setState({ kind: 'done', data });
      } catch (e) {
        setState({
          kind: 'error',
          message: 'Não foi possível carregar os resultados.',
        });
      }
    };
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, searchBy]);

  // submit local da barra da própria página
  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    router.push(`/buscar?q=${encodeURIComponent(query)}&field=${searchBy}`);
  };

  // trocar o filtro mantendo a mesma query
  const onChangeField = (value: 'title' | 'author' | 'event') => {
    setSearchBy(value);
    router.push(`/buscar?q=${encodeURIComponent(query || q)}&field=${value}`);
  };

  const headerInfo = useMemo(() => {
    const count =
      state.kind === 'done' ? state.data.length : state.kind === 'loading' ? '…' : 0;
    const fld = labelByField[searchBy] ?? 'Título';
    return { count, fld };
  }, [state, searchBy]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white">
      <Header />

      <main className="mx-auto min-h-[85vh] max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        {/* Barra de busca local */}
        <form
          onSubmit={onSubmit}
          className="mx-auto mb-8 flex max-w-4xl flex-col gap-2 sm:flex-row sm:gap-0"
        >
          <div className="relative flex-1">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar artigos, autores, eventos…"
              className="w-full rounded-xl border border-gray-300 pl-12 pr-4 py-3 text-base shadow-lg outline-none focus:border-transparent focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={searchBy}
            onChange={(e) =>
              onChangeField(e.target.value as 'title' | 'author' | 'event')
            }
            className="cursor-pointer border-0 bg-blue-600 p-3 text-white outline-none hover:bg-blue-700"
          >
            <option value="title">Título</option>
            <option value="author">Autor</option>
            <option value="event">Evento</option>
          </select>
          <button
            type="submit"
            className="cursor-pointer rounded-r-xl bg-blue-600 px-6 py-3 text-white transition hover:bg-blue-700"
          >
            Buscar
          </button>
        </form>

        {/* Cabeçalho e contagem */}
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-blue-900">
              Resultados para “{q}”
            </h2>
            <p className="text-sm text-gray-600">
              Filtrando por: <span className="font-medium">{headerInfo.fld}</span> ·{' '}
              <span className="font-medium">{headerInfo.count}</span> resultado(s)
            </p>
          </div>
        </div>

        {/* Conteúdo */}
        {state.kind === 'loading' && (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-44 animate-pulse rounded-2xl border border-blue-100 bg-white p-5"
              >
                <div className="h-5 w-3/4 rounded bg-gray-200" />
                <div className="mt-3 h-4 w-1/2 rounded bg-gray-200" />
                <div className="mt-1 h-4 w-1/3 rounded bg-gray-200" />
                <div className="mt-6 h-9 w-full rounded bg-gray-200" />
              </div>
            ))}
          </div>
        )}

        {state.kind === 'error' && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
            {state.message}
          </div>
        )}

        {state.kind === 'done' && state.data.length === 0 && (
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-6 text-center text-blue-900">
            Nenhum resultado encontrado. Tente ajustar sua busca.
          </div>
        )}

        {state.kind === 'done' && state.data.length > 0 && (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {state.data.map((a) => (
              <ResultCard key={a.id} item={a} onOpen={() => setSelected(a)} />
            ))}
          </div>
        )}
      </main>

      <Footer />

      {/* Modal de detalhes */}
      <ArticleDetailModal article={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
