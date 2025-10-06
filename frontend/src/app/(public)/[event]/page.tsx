'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import Header from '@/app/components/Header';
import Footer from '@/app/components/Footer';
import { CalendarDays, MapPin } from 'lucide-react';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

type EventItem = {
  id: number;
  name: string;
  description?: string | null;
};

type EditionItem = {
  id: number;
  event_id: number;
  year: number;
  local?: string | null;
  description?: string | null;
};

type FetchState<T> =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'done'; data: T };

export default function EventHomePage() {
  const params = useParams<{ event: string }>();
  const eventSlug = params?.event; // vem da pasta [event]

  const [state, setState] = useState<
    FetchState<{ event: EventItem; editions: EditionItem[] }>
  >({ kind: 'idle' });

  useEffect(() => {
    let cancel = false;
    if (!eventSlug) return;

    const eventParam = decodeURIComponent(eventSlug);
    (async () => {
      setState({ kind: 'loading' });
      try {
        // endpoint público esperado: devolve { event, editions }
        const res = await fetch(
          `${BASE_URL}/public/events/${encodeURIComponent(eventParam)}`,
          { cache: 'no-store' }
        );

        if (!res.ok) {
          const payload = await res.json().catch(() => ({} as any));
          const msg =
            payload?.error?.message ||
            `Falha ao carregar evento: HTTP ${res.status}`;
          if (!cancel) setState({ kind: 'error', message: msg });
          return;
        }

        const json = await res.json();
        const event: EventItem | undefined = json.event;
        const editions: EditionItem[] = (json.editions ?? []).sort(
          (a: EditionItem, b: EditionItem) => b.year - a.year
        );

        if (!event) {
          if (!cancel)
            setState({
              kind: 'error',
              message: `Evento "${eventParam}" não encontrado.`,
            });
          return;
        }

        if (!cancel) setState({ kind: 'done', data: { event, editions } });
      } catch (e: any) {
        if (!cancel)
          setState({
            kind: 'error',
            message:
              e?.message ||
              'Não foi possível carregar o evento. Verifique o backend público.',
          });
      }
    })();

    return () => {
      cancel = true;
    };
  }, [eventSlug]);

  const title = useMemo(
    () =>
      state.kind === 'done'
        ? state.data.event.name
        : eventSlug
        ? decodeURIComponent(eventSlug)
        : 'Evento',
    [state, eventSlug]
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white">
      <Header />

      <main className="mx-auto min-h-[85vh] max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        {(state.kind === 'idle' || state.kind === 'loading') && (
          <div className="mx-auto max-w-3xl">
            <div className="h-8 w-1/2 animate-pulse rounded bg-gray-200" />
            <div className="mt-3 h-4 w-2/3 animate-pulse rounded bg-gray-200" />
            <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="h-40 animate-pulse rounded-2xl border border-cyan-100 bg-white p-4"
                />
              ))}
            </div>
          </div>
        )}

        {state.kind === 'error' && (
          <div className="mx-auto max-w-3xl rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
            {state.message}
          </div>
        )}

        {state.kind === 'done' && (
          <>
            {/* HERO */}
            <section className="mx-auto max-w-3xl">
              <h1 className="text-3xl font-bold text-amber-900">{title}</h1>
              {state.data.event.description && (
                <p className="mt-2 text-gray-700">
                  {state.data.event.description}
                </p>
              )}
            </section>

            {/* EDIÇÕES */}
            <section className="mt-8">
              <h2 className="mb-4 text-xl font-semibold text-cyan-800">
                Edições
              </h2>

              {state.data.editions.length === 0 ? (
                <div className="rounded-xl border border-cyan-200 bg-cyan-50/40 p-6 text-center text-cyan-800">
                  Nenhuma edição cadastrada para este evento.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {state.data.editions.map((ed) => (
                    <Link
                      key={ed.id}
                      href={`/${eventSlug}/${ed.year}`}
                      className="group relative overflow-hidden rounded-2xl border border-cyan-200 bg-white p-6 shadow-sm transition hover:shadow-md"
                    >
                      <div
                        aria-hidden
                        className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-cyan-500/90 via-cyan-400 to-cyan-600/90"
                      />
                      <div className="text-center">
                        <div className="inline-flex items-center gap-2 text-sm font-semibold text-cyan-900">
                          <CalendarDays className="h-4 w-4" />
                          {ed.year}
                        </div>

                        <p className="mt-2 flex items-center justify-center gap-2 text-xs text-gray-600">
                          <MapPin className="h-3.5 w-3.5 text-cyan-500" />
                          {ed.local?.trim() || 'Local não definido'}
                        </p>

                        {ed.description && (
                          <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-gray-600">
                            {ed.description}
                          </p>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>

      <Footer />
    </div>
  );
}
