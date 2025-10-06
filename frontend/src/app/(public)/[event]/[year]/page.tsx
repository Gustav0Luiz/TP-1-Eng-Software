'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import Header from '@/app/components/Header';
import Footer from '@/app/components/Footer';
import { BookOpen, Download, ChevronLeft } from 'lucide-react';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

type ArticleDisplay = {
  id: number;
  title: string;
  abstract: string | null;
  event_name?: string;
  edition_year?: number;
  authors?: string[];
  start_page?: number | null;
  end_page?: number | null;
  created_at: string;
};

type EditionData = {
  event_name: string;
  year: number;
  description?: string | null;
  local?: string | null;
};

type FetchState<T> =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'done'; data: T };

export default function EditionPage() {
  const params = useParams<{ event: string; year: string }>();
  const eventSlug = params?.event;
  const yearParam = params?.year;

  const [state, setState] = useState<
    FetchState<{ edition: EditionData; articles: ArticleDisplay[] }>
  >({ kind: 'idle' });

  useEffect(() => {
    let cancel = false;
    if (!eventSlug || !yearParam) return;

    const eventParam = decodeURIComponent(eventSlug);
    const year = parseInt(yearParam, 10);
    if (!Number.isFinite(year)) return;

    (async () => {
      setState({ kind: 'loading' });
      try {
        const res = await fetch(
          `${BASE_URL}/public/editions/${encodeURIComponent(eventParam)}/${year}`,
          { cache: 'no-store' }
        );

        if (!res.ok) {
          const payload = await res.json().catch(() => ({} as any));
          const msg = payload?.error?.message || `Falha ao carregar edição: HTTP ${res.status}`;
          if (!cancel) setState({ kind: 'error', message: msg });
          return;
        }

        const json = await res.json();
        const edition: EditionData | undefined = json.edition;
        const articles: ArticleDisplay[] = json.articles ?? [];

        if (!edition) {
          if (!cancel)
            setState({
              kind: 'error',
              message: `Edição ${year} de "${eventParam}" não encontrada.`,
            });
          return;
        }

        if (!cancel) setState({ kind: 'done', data: { edition, articles } });
      } catch (e: any) {
        if (!cancel)
          setState({
            kind: 'error',
            message: e?.message || 'Não foi possível carregar os artigos.',
          });
      }
    })();

    return () => {
      cancel = true;
    };
  }, [eventSlug, yearParam]);

  const title = useMemo(() => {
    if (state.kind !== 'done') return 'Edição';
    return state.data.edition.event_name;
  }, [state]);

  const yearText = useMemo(() => {
    if (state.kind !== 'done') return '';
    return String(state.data.edition.year);
  }, [state]);

  const countText = useMemo(() => {
    if (state.kind !== 'done') return '';
    const total = state.data.articles.length;
    return `${total} ${total === 1 ? 'artigo' : 'artigos'}`;
  }, [state]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white">
      <Header />

      <main className="mx-auto min-h-[85vh] max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        {(state.kind === 'idle' || state.kind === 'loading') && (
          <div className="mx-auto max-w-4xl">
            <div className="h-8 w-3/4 animate-pulse rounded bg-gray-200" />
            <div className="mt-2 h-4 w-2/3 animate-pulse rounded bg-gray-200" />
            <div className="mt-6 h-8 w-32 animate-pulse rounded bg-gray-200" />
            <div className="mt-8 space-y-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="h-28 animate-pulse rounded-2xl border border-blue-100 bg-white p-4"
                />
              ))}
            </div>
          </div>
        )}

        {state.kind === 'error' && (
          <div className="mx-auto max-w-4xl rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
            {state.message}
          </div>
        )}

        {state.kind === 'done' && (
          <>
            {/* HERO compacto, com ano e contador */}
            <section className="mx-auto max-w-4xl">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h1 className="text-3xl font-bold text-amber-900">{title}</h1>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-sm font-semibold text-blue-800">
                      {yearText}
                    </span>
                    <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-800">
                      {countText}
                    </span>
                  </div>

                  {state.data.edition.description || state.data.edition.local ? (
                    <p className="mt-3 text-sm text-gray-700">
                      {state.data.edition.description}
                      {state.data.edition.local ? ` — Local: ${state.data.edition.local}` : ''}
                    </p>
                  ) : null}
                </div>

                <Link
                  href={`/${eventSlug}`}
                  className="inline-flex items-center gap-2 rounded-lg border border-blue-300 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-800 transition hover:bg-blue-100 hover:text-blue-900"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Voltar ao evento
                </Link>
              </div>
            </section>

            {/* LISTA DE ARTIGOS (mantém o card que você curtiu) */}
            <section className="mx-auto mt-6 max-w-4xl">
              {state.data.articles.length === 0 ? (
                <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-6 text-center text-blue-800">
                  Nenhum artigo cadastrado nesta edição.
                </div>
              ) : (
                <ul className="space-y-4">
                  {state.data.articles.map((a) => (
                    <li
                      key={a.id}
                      className="group rounded-2xl border border-blue-200 bg-white p-6 shadow-sm transition hover:shadow-md"
                    >
                      <div className="flex items-start gap-4">
                        <div
                          aria-hidden
                          className="mt-1 h-6 w-6 shrink-0 rounded-full border border-blue-200 bg-blue-50 grid place-items-center"
                        >
                          <BookOpen className="h-4 w-4 text-blue-600" />
                        </div>

                        <div className="flex-1">
                          <h3 className="text-base font-bold leading-snug text-blue-900">
                            {a.title}
                          </h3>

                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            {(a.authors || []).length ? (
                              <p className="text-sm text-gray-700">
                                {a.authors!.join(', ')}
                              </p>
                            ) : (
                              <span className="text-sm text-gray-500">
                                Autores não informados
                              </span>
                            )}

                            <span className="hidden sm:inline text-gray-300">•</span>

                            <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-800">
                              Páginas {a.start_page ?? '—'}–{a.end_page ?? 'Fim'}
                            </span>

                            <span className="hidden sm:inline text-gray-300">•</span>

                            <span className="text-xs text-gray-500">
                              Criado em {new Date(a.created_at).toLocaleDateString()}
                            </span>
                          </div>

                          {a.abstract && (
                            <p className="mt-3 text-sm leading-relaxed text-gray-700">
                              {a.abstract}
                            </p>
                          )}
                        </div>

                        <a
                          href={`${BASE_URL}/articles/${a.id}/pdf`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="
                            inline-flex items-center gap-2 rounded-lg border border-blue-300
                            bg-blue-600 px-3 py-2 text-sm font-semibold text-white
                            transition hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40
                          "
                          aria-label={`Baixar PDF do artigo ${a.title}`}
                        >
                          <Download className="h-4 w-4" />
                          PDF
                        </a>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </main>

      <Footer />
    </div>
  );
}
