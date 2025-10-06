'use client';

import { useState } from 'react';
import Header from '@/app/components/Header';
import Footer from '@/app//components/Footer';
import { Mail, User, CheckCircle2 } from 'lucide-react';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export default function AlertasPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFeedback(null);

    try {
      const res = await fetch(`${BASE_URL}/public/alerts/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // name deve ser exatamente o nome do autor que você quer monitorar
        body: JSON.stringify({ name: name.trim(), email: email.trim() }),
      });
      const json = await res.json().catch(() => ({}));

      if (res.ok) {
        setFeedback({ ok: true, msg: 'Cadastro realizado! Você receberá e-mails quando novos artigos com esse nome forem adicionados.' });
        setName('');
        setEmail('');
      } else {
        setFeedback({ ok: false, msg: json?.error?.message || `Falha ao cadastrar: HTTP ${res.status}` });
      }
    } catch (err: any) {
      setFeedback({ ok: false, msg: err?.message || 'Erro de conexão.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white font-serif">
      <Header />

      <main className="mx-auto min-h-[85vh] max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-blue-900">Receber alertas por e-mail</h1>
        <p className="mt-2 text-gray-700">
          Preencha com seu <strong>nome completo</strong> (exatamente como aparece nos artigos) e seu e-mail.
          Sempre que um novo artigo com esse nome for cadastrado, enviaremos um aviso para você.
        </p>

        <form onSubmit={onSubmit} className="mt-8 space-y-5 rounded-2xl border border-blue-100 bg-white p-6 shadow-sm">
          <div>
            <label className="block text-sm font-medium text-gray-700">Nome (exato)</label>
            <div className="mt-1 relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <User className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.currentTarget.value)}
                placeholder="Ex.: Maria Silva"
                required
                className="w-full rounded-lg border px-10 py-3 outline-none focus:ring-2 focus:ring-blue-500 border-gray-300"
              />
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Use o mesmo nome que aparece nas publicações para correspondência exata.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">E-mail</label>
            <div className="mt-1 relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Mail className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.currentTarget.value)}
                placeholder="voce@exemplo.com"
                required
                className="w-full rounded-lg border px-10 py-3 outline-none focus:ring-2 focus:ring-blue-500 border-gray-300"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="cursor-pointer inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
            >
              <CheckCircle2 className="h-5 w-5" />
              {submitting ? 'Cadastrando…' : 'Cadastrar alerta'}
            </button>
          </div>

          {feedback && (
            <div
              className={`rounded-lg border p-3 text-sm ${
                feedback.ok
                  ? 'border-green-200 bg-green-50 text-green-800'
                  : 'border-red-200 bg-red-50 text-red-700'
              }`}
            >
              {feedback.msg}
            </div>
          )}
        </form>

        <p className="mt-6 text-sm text-gray-600">
          Você pode remover sua inscrição a qualquer momento através do link disponibilizado no e-mail de alerta.
        </p>
      </main>

      <Footer />
    </div>
  );
}
