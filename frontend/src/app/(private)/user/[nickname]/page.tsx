'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import Header from '@/app/components/Header';
import Footer from '@/app/components/Footer';
import { PlusCircle, Upload, FileText, Clipboard } from 'lucide-react'; // Ícones para adicionar, upload de arquivos e outros
import Link from 'next/link';

export default function UserHome() {
  const router = useRouter();
  const params = useParams<{ nickname: string }>();
  const { user, loading } = useAuth();
  
  const [articles, setArticles] = useState<any[]>([]); // Para armazenar os artigos do usuário
  const [showModal, setShowModal] = useState(false); // Estado para controlar o modal
  const [isBulkUpload, setIsBulkUpload] = useState(false); // Para controlar se será um cadastro em massa ou manual
  const [newArticle, setNewArticle] = useState({
    title: '',
    abstract: '',
    pdf: null as File | null,
  }); // Dados do artigo a ser criado

  useEffect(() => {
    if (loading) return; // aguardando checar token
    const urlNick = (params?.nickname ?? '').toString().toLowerCase();

    if (!user) {
      // não autenticado → login
      router.replace('/login');
      return;
    }
    if (user.nickname.toLowerCase() !== urlNick) {
      // autenticado mas a URL não corresponde ao apelido do usuário logado
      router.replace(`/${user.nickname}`);
    }

    // Fetch os artigos do usuário
    const fetchArticles = async () => {
      try {
        const res = await fetch(`/api/user/${user.nickname}/articles`);
        if (res.ok) {
          const data = await res.json();
          setArticles(data.articles);
        } else {
          console.error('Erro ao carregar artigos');
        }
      } catch (err) {
        console.error('Erro ao carregar artigos:', err);
      }
    };

    fetchArticles(); // Carregar os artigos ao entrar na página
  }, [loading, user, params?.nickname, router]);

  if (loading || !user) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center text-gray-600">
        Carregando…
      </div>
    );
  }

  // Função para cadastrar um artigo
  const handleCreateArticle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isBulkUpload) {
      // Aqui podemos implementar a lógica para o upload de múltiplos artigos via BibTeX (exemplo não implementado aqui)
      console.log('Implementar upload em massa...');
    } else {
      // Para cadastro manual do artigo
      const formData = new FormData();
      formData.append('title', newArticle.title);
      formData.append('abstract', newArticle.abstract);
      if (newArticle.pdf) formData.append('pdf', newArticle.pdf);

      try {
        const res = await fetch('/api/articles', {
          method: 'POST',
          body: formData,
        });

        if (res.ok) {
          const createdArticle = await res.json();
          console.log('Artigo criado:', createdArticle);
          setShowModal(false); // Fechar modal
          // Atualizar lista de artigos, etc.
        } else {
          console.error('Erro ao criar artigo');
        }
      } catch (error) {
        console.error('Erro ao criar artigo:', error);
      }
    }
  };

  return (
    <>
      {/* Header fixado no topo */}
      <Header />

      <div className="min-h-screen max-w-4xl mx-auto px-4 py-10 flex flex-col">
        {/* Título de boas-vindas */}
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
                  <h3 className="text-lg font-semibold text-blue-900">{article.title}</h3>
                  <p className="text-sm text-gray-600 mt-2">{article.abstract}</p>
                  <div className="mt-4">
                    <Link href={`/artigos/${article.id}`} className="text-blue-600 hover:text-blue-800">
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
          <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
            <div className="bg-white p-6 rounded-lg w-96">
              <h3 className="text-xl font-semibold">Cadastrar Novo Artigo</h3>
              <div className="mt-4">
                <button
                  onClick={() => setIsBulkUpload(false)}
                  className={`px-4 py-2 rounded-lg ${!isBulkUpload ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'}`}
                >
                  Cadastro Manual
                </button>
                <button
                  onClick={() => setIsBulkUpload(true)}
                  className={`px-4 py-2 rounded-lg ${isBulkUpload ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'}`}
                >
                  Importar BibTeX
                </button>
              </div>
              <form onSubmit={handleCreateArticle} className="space-y-4 mt-4">
                {!isBulkUpload ? (
                  <>
                    <div>
                      <label htmlFor="title" className="block text-sm font-medium text-gray-700">Título</label>
                      <input
                        type="text"
                        id="title"
                        value={newArticle.title}
                        onChange={(e) => setNewArticle({ ...newArticle, title: e.target.value })}
                        required
                        className="w-full rounded-lg border px-4 py-2"
                      />
                    </div>
                    <div>
                      <label htmlFor="abstract" className="block text-sm font-medium text-gray-700">Resumo</label>
                      <textarea
                        id="abstract"
                        value={newArticle.abstract}
                        onChange={(e) => setNewArticle({ ...newArticle, abstract: e.target.value })}
                        required
                        className="w-full rounded-lg border px-4 py-2"
                      />
                    </div>
                    <div>
                      <label htmlFor="pdf" className="block text-sm font-medium text-gray-700">PDF</label>
                      <input
                        type="file"
                        id="pdf"
                        onChange={(e) => setNewArticle({ ...newArticle, pdf: e.target.files ? e.target.files[0] : null })}
                        required
                        className="w-full text-sm border rounded-lg px-4 py-2"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label htmlFor="bibtex" className="block text-sm font-medium text-gray-700">Importar BibTeX</label>
                      <input
                        type="file"
                        id="bibtex"
                        className="w-full text-sm border rounded-lg px-4 py-2"
                      />
                    </div>
                    <p className="mt-2 text-xs text-gray-500">Envie um arquivo .bibtex com múltiplos artigos.</p>
                  </>
                )}
                <div className="flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 text-gray-500 hover:text-gray-700"
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

      {/* Footer fixado na parte inferior */}
      <Footer />
    </>
  );
}
