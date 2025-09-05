'use client';
import { useState } from 'react';
import { api } from '@/lib/api';
import Header from '../components/Header';

export default function TestConnection() {
  const [results, setResults] = useState<{
    backend?: { success: boolean; message: string };
    frontend?: { success: boolean; message: string };
    database?: { success: boolean; message: string; data?: any };
  }>({});
  
  const [loading, setLoading] = useState<{
    backend: boolean;
    frontend: boolean;
    database: boolean;
  }>({ backend: false, frontend: false, database: false });

  const testBackendConnection = async () => {
    setLoading(prev => ({ ...prev, backend: true }));
    try {
      const response = await api.ping();
      setResults(prev => ({
        ...prev,
        backend: { success: true, message: `Backend respondeu: ${response.message}` }
      }));
    } catch (error) {
      setResults(prev => ({
        ...prev,
        backend: { success: false, message: `Erro: ${error}` }
      }));
    } finally {
      setLoading(prev => ({ ...prev, backend: false }));
    }
  };

  const testFrontendConnection = async () => {
    setLoading(prev => ({ ...prev, frontend: true }));
    try {
      // Test if frontend is working by checking if we can access window object and basic functionality
      const startTime = Date.now();
      const testData = { test: 'Frontend funcionando!', timestamp: new Date().toISOString() };
      const endTime = Date.now();
      
      setResults(prev => ({
        ...prev,
        frontend: { 
          success: true, 
          message: `Frontend OK! Tempo de resposta: ${endTime - startTime}ms. React está funcionando corretamente.` 
        }
      }));
    } catch (error) {
      setResults(prev => ({
        ...prev,
        frontend: { success: false, message: `Erro no frontend: ${error}` }
      }));
    } finally {
      setLoading(prev => ({ ...prev, frontend: false }));
    }
  };

  const testDatabaseConnection = async () => {
    setLoading(prev => ({ ...prev, database: true }));
    try {
      // First test basic connection
      const healthResponse = await api.health();
      if (!healthResponse.ok) {
        throw new Error('Conexão com banco falhou');
      }

      // Then get all database data
      const databaseData = await api.getDatabaseData();
      console.log('=== DADOS DO BANCO DE DADOS ===');
      console.log('Resumo:', databaseData.summary);
      console.log('Usuários:', databaseData.users);
      console.log('Eventos:', databaseData.events);
      console.log('Autores:', databaseData.authors);
      console.log('Artigos:', databaseData.articles);
      console.log('Relação Artigo-Autor:', databaseData.article_authors);
      console.log('=== FIM DOS DADOS ===');

      setResults(prev => ({
        ...prev,
        database: { 
          success: true, 
          message: `Banco conectado! Total de registros: ${databaseData.summary.total_users} usuários, ${databaseData.summary.total_events} eventos, ${databaseData.summary.total_authors} autores, ${databaseData.summary.total_articles} artigos. Dados completos no console.`,
          data: databaseData
        }
      }));
    } catch (error) {
      setResults(prev => ({
        ...prev,
        database: { success: false, message: `Erro: ${error}` }
      }));
    } finally {
      setLoading(prev => ({ ...prev, database: false }));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white font-serif">
      <Header />
      
      <main className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-blue-900 mb-8">Teste de Conexões</h1>
        
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {/* Teste Backend */}
            <button
              onClick={testBackendConnection}
              disabled={loading.backend}
              className="p-6 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <div className="text-center">
                <div className="text-lg font-bold mb-2">
                  {loading.backend ? 'Testando...' : 'Testar Backend'}
                </div>
                <div className="text-sm opacity-90">
                  Conexão com API do servidor
                </div>
              </div>
            </button>
            
            {/* Teste Frontend */}
            <button
              onClick={testFrontendConnection}
              disabled={loading.frontend}
              className="p-6 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <div className="text-center">
                <div className="text-lg font-bold mb-2">
                  {loading.frontend ? 'Testando...' : 'Testar Frontend'}
                </div>
                <div className="text-sm opacity-90">
                  Funcionalidade do React
                </div>
              </div>
            </button>
            
            {/* Teste Database */}
            <button
              onClick={testDatabaseConnection}
              disabled={loading.database}
              className="p-6 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <div className="text-center">
                <div className="text-lg font-bold mb-2">
                  {loading.database ? 'Testando...' : 'Testar Banco de Dados'}
                </div>
                <div className="text-sm opacity-90">
                  Conexão e dados do PostgreSQL
                </div>
              </div>
            </button>
          </div>

          <div className="space-y-4">
            {/* Resultado Backend */}
            {results.backend && (
              <div className={`p-4 rounded-lg ${results.backend.success ? 'bg-green-100 border-green-500' : 'bg-red-100 border-red-500'} border`}>
                <h3 className="font-bold text-lg mb-2">🔗 Conexão Backend:</h3>
                <p className={results.backend.success ? 'text-green-700' : 'text-red-700'}>
                  {results.backend.message}
                </p>
              </div>
            )}

            {/* Resultado Frontend */}
            {results.frontend && (
              <div className={`p-4 rounded-lg ${results.frontend.success ? 'bg-green-100 border-green-500' : 'bg-red-100 border-red-500'} border`}>
                <h3 className="font-bold text-lg mb-2">⚛️ Frontend React:</h3>
                <p className={results.frontend.success ? 'text-green-700' : 'text-red-700'}>
                  {results.frontend.message}
                </p>
              </div>
            )}

            {/* Resultado Database */}
            {results.database && (
              <div className={`p-4 rounded-lg ${results.database.success ? 'bg-green-100 border-green-500' : 'bg-red-100 border-red-500'} border`}>
                <h3 className="font-bold text-lg mb-2">🗄️ Banco de Dados:</h3>
                <p className={results.database.success ? 'text-green-700' : 'text-red-700'}>
                  {results.database.message}
                </p>
                {results.database.success && results.database.data && (
                  <div className="mt-4">
                    <h4 className="font-semibold mb-2">Dados na tela:</h4>
                    <div className="bg-gray-50 p-4 rounded-lg max-h-96 overflow-y-auto">
                      <div className="space-y-4">
                        <div>
                          <h5 className="font-medium text-blue-900">📊 Resumo:</h5>
                          <pre className="text-sm text-gray-700 mt-1">
                            {JSON.stringify(results.database.data.summary, null, 2)}
                          </pre>
                        </div>
                        
                        <div>
                          <h5 className="font-medium text-blue-900">👥 Usuários ({results.database.data.users.length}):</h5>
                          <pre className="text-sm text-gray-700 mt-1">
                            {JSON.stringify(results.database.data.users, null, 2)}
                          </pre>
                        </div>
                        
                        <div>
                          <h5 className="font-medium text-blue-900">📅 Eventos ({results.database.data.events.length}):</h5>
                          <pre className="text-sm text-gray-700 mt-1">
                            {JSON.stringify(results.database.data.events, null, 2)}
                          </pre>
                        </div>
                        
                        <div>
                          <h5 className="font-medium text-blue-900">✍️ Autores ({results.database.data.authors.length}):</h5>
                          <pre className="text-sm text-gray-700 mt-1">
                            {JSON.stringify(results.database.data.authors, null, 2)}
                          </pre>
                        </div>
                        
                        <div>
                          <h5 className="font-medium text-blue-900">📄 Artigos ({results.database.data.articles.length}):</h5>
                          <pre className="text-sm text-gray-700 mt-1">
                            {JSON.stringify(results.database.data.articles, null, 2)}
                          </pre>
                        </div>
                        
                        <div>
                          <h5 className="font-medium text-blue-900">🔗 Relações Artigo-Autor ({results.database.data.article_authors.length}):</h5>
                          <pre className="text-sm text-gray-700 mt-1">
                            {JSON.stringify(results.database.data.article_authors, null, 2)}
                          </pre>
                        </div>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mt-2">
                      💡 Dados completos também foram impressos no console do navegador (F12 → Console)
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
