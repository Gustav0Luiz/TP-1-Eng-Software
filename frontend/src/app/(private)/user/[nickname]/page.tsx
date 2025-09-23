'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import Header from '@/app/components/Header';
import Footer from '@/app/components/Footer';
import { PlusCircle } from 'lucide-react';
import Link from 'next/link';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

type NewArticleState = {
  title: string;
  abstract: string;
  pdf: File | null;
  edition_id: number | '' ; // obrigatório no backend
  authorsCsv: string;       // opcional (separado por ; ou ,)
};

export default function UserHome() {
  const router = useRouter();
  const params = useParams<{ nickname: string }>();
  const { user, loading, token } = useAuth();

  const [articles, setArticles] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [isBulkUpload, setIsBulkUpload] = useState(false);

  const [newArticle, setNewArticle] = useState<NewArticleState>({
    title: '',
    abstract: '',
    pdf: null,
    edition_id: '',
    authorsCsv: '',
  });

  // carrega artigos do usuário autenticado
  const fetchArticles = async () => {
    if (!token) return;
    try {
      // rota protegida no backend (sugestão implementada: GET /articles/mine)
      const res = await fetch(`${BASE_URL}/articles/mine`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
      if (res.ok) {
        const data = await res.json();
        setArticles(data.articles ?? []);
      } else {
        console.error('Erro ao carregar artigos');
      }
    } catch (err) {
      console.error('Erro ao carregar artigos:', err);
    }
  };

  useEffect(() => {
    if (loading) return;

    const urlNick = (params?.nickname ?? '').toString().toLowerCase();
    if (!user) {
      router.replace('/login');
      return;
    }
    if (user.nickname.toLowerCase() !== urlNick) {
      // corrige o caminho para a rota privada correta
      router.replace(`/user/${user.nickname}`);
      return;
    }

    fetchArticles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user, params?.nickname, token]);

  if (loading || !user) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center text-gray-600">
        Carregando…
      </div>
    );
  }

  // cadastro manual de artigo
  const handleCreateArticle = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isBulkUpload) {
      // TODO: implementar importação de BibTeX + ZIP (backend: POST /articles/bulk-bibtex)
      console.log('Importação em massa ainda não implementada neste formulário.');
      return;
    }

    // validação simples no client
    if (!newArticle.title.trim() || !newArticle.pdf || newArticle.edition_id === '') {
      alert('Preencha Título, selecione o PDF e informe a Edição (edition_id).');
      return;
    }

    const formData = new FormData();
    formData.append('title', newArticle.title);
    formData.append('abstract', newArticle.abstract);
    formData.append('edition_id', String(newArticle.edition_id));
    if (newArticle.authorsCsv.trim()) {
      // backend aceita CSV ou JSON; aqui mandamos CSV
      formData.append('authors', newArticle.authorsCsv.trim());
    }
    formData.append('pdf', newArticle.pdf);

    try {
      const res = await fetch(`${BASE_URL}/articles`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          // NÃO defina Content-Type aqui; o browser define o boundary do multipart
        },
        body: formData,
      });

      if (res.ok) {
        // fecha modal, limpa formulário e recarrega lista
        setShowModal(false);
        setNewArticle({
          title: '',
          abstract: '',
          pdf: null,
          edition_id: '',
          authorsCsv: '',
        });
        await fetchArticles();
      } else {
        const err = await res.json().catch(() => ({}));
        console.error('Erro ao criar artigo', err);
        alert(err?.error?.message || 'Erro ao criar artigo');
      }
    } catch (error) {
      console.error('Erro ao criar artigo:', error);
      alert('Erro ao criar artigo');
    }
  };

  return (
    <>
      <Header />

      <div className="min-h-screen max-w-4xl mx-auto px-4 py-10 flex flex-col">
        <h1 className="text-2xl font-bold text-blue-900">
          Olá, {user.first_name} {user.last_name} (@{user.nickname})
        </h1>
        <p className="mt-2 text-gray-600">Bem-vindo à sua área!</p>

        {/* Box de Artigos do Usuário */}
        <div className="mt-8">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-blue-900">Meus Artigos</h2>
            <button
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              onClick={() => setShowModal(true)}
            >
              <PlusCircle className="h-5 w-5" />
              <span>Adicionar Novo Artigo</span>
            </button>
          </div>

          {/* Lista de Artigos */}
          <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {articles.length === 0 ? (
              <div className="col-span-full text-center text-gray-500">
                Você ainda não tem artigos. Clique no botão acima para adicionar.
              </div>
            ) : (
              articles.map((article) => (
                <div
                  key={article.id}
                  className="p-4 bg-white shadow-md rounded-lg border border-gray-200"
                >
                  <h3 className="text-lg font-semibold text-blue-900">
                    {article.title}
                  </h3>
                  {article.abstract && (
                    <p className="text-sm text-gray-600 mt-2 line-clamp-4">
                      {article.abstract}
                    </p>
                  )}
                  <div className="mt-4">
                    <Link
                      href={`/artigos/${article.id}`}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      Ver mais
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Modal de Cadastro de Artigo */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex justify-center items-center px-4">
            <div className="bg-white p-6 rounded-lg w-full max-w-md">
              <h3 className="text-xl font-semibold">Cadastrar Novo Artigo</h3>

              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => setIsBulkUpload(false)}
                  className={`px-4 py-2 rounded-lg ${
                    !isBulkUpload
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  Cadastro Manual
                </button>
                <button
                  onClick={() => setIsBulkUpload(true)}
                  className={`px-4 py-2 rounded-lg ${
                    isBulkUpload
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  Importar BibTeX
                </button>
              </div>

              <form onSubmit={handleCreateArticle} className="space-y-4 mt-4">
                {!isBulkUpload ? (
                  <>
                    <div>
                      <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                        Título
                      </label>
                      <input
                        id="title"
                        type="text"
                        value={newArticle.title}
                        onChange={(e) =>
                          setNewArticle((s) => ({ ...s, title: e.target.value }))
                        }
                        required
                        className="w-full rounded-lg border px-4 py-2"
                      />
                    </div>

                    <div>
                      <label htmlFor="abstract" className="block text-sm font-medium text-gray-700">
                        Resumo
                      </label>
                      <textarea
                        id="abstract"
                        value={newArticle.abstract}
                        onChange={(e) =>
                          setNewArticle((s) => ({ ...s, abstract: e.target.value }))
                        }
                        className="w-full rounded-lg border px-4 py-2"
                      />
                    </div>

                    <div>
                      <label htmlFor="authors" className="block text-sm font-medium text-gray-700">
                        Autores (opcional, separados por ; ou ,)
                      </label>
                      <input
                        id="authors"
                        type="text"
                        value={newArticle.authorsCsv}
                        onChange={(e) =>
                          setNewArticle((s) => ({ ...s, authorsCsv: e.target.value }))
                        }
                        placeholder="Maria; João; Fulano"
                        className="w-full rounded-lg border px-4 py-2"
                      />
                    </div>

                    <div>
                      <label htmlFor="edition" className="block text-sm font-medium text-gray-700">
                        Edição (edition_id) *
                      </label>
                      <input
                        id="edition"
                        type="number"
                        value={newArticle.edition_id}
                        onChange={(e) =>
                          setNewArticle((s) => ({
                            ...s,
                            edition_id: e.target.value === '' ? '' : Number(e.target.value),
                          }))
                        }
                        required
                        className="w-full rounded-lg border px-4 py-2"
                        placeholder="Ex.: 1"
                        min={1}
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Informe o ID da edição (cada edição pertence a um evento e ano).
                      </p>
                    </div>

                    <div>
                      <label htmlFor="pdf" className="block text-sm font-medium text-gray-700">
                        PDF *
                      </label>
                      <input
                        id="pdf"
                        type="file"
                        accept="application/pdf"
                        onChange={(e) =>
                          setNewArticle((s) => ({
                            ...s,
                            pdf: e.target.files && e.target.files[0] ? e.target.files[0] : null,
                          }))
                        }
                        required
                        className="w-full text-sm border rounded-lg px-4 py-2"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    {/* Placeholder para importação em massa (a implementar) */}
                    <p className="text-sm text-gray-700">
                      Importação BibTeX + ZIP ainda será implementada.
                    </p>
                  </>
                )}

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    {isBulkUpload ? 'Importar Artigos' : 'Cadastrar Artigo'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>

      <Footer />
    </>
  );
}
