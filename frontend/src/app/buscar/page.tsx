import Header from "../components/Header";
type Props = { searchParams: { q?: string } };

export default async function BuscarPage({ searchParams }: Props) {
  const q = (searchParams.q ?? '').toString().trim();

  // Exemplo de busca (substitua pela sua função real):
  // const results = q ? await searchArticles(q) : [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white font-serif">
     <Header />
      <div className="max-w-7xl mx-auto px-4 py-10 font-serif">
      <h1 className="text-2xl font-bold text-blue-900 mb-6">
        Resultados para: <span className="text-blue-600">{q || '—'}</span>
      </h1>

      {!q && (
        <p className="text-gray-600">
          Digite um termo de busca na página inicial.
        </p>
      )}

      {q && (
        <div className="space-y-4">
          {/* Renderize seus resultados reais aqui */}
          {/* Exemplo mock */}
          <div className="rounded-xl border p-4">
            <p className="font-semibold">Exemplo de artigo relacionado a “{q}”</p>
            <p className="text-sm text-gray-600">Resumo do artigo…</p>
          </div>
        </div>
      )}
      </div>
    </div>
    
  )};
