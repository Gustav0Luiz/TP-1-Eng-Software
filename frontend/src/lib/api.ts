// Configuração da API para comunicação com o backend

const getApiBaseUrl = () => {
  // Prefixo NEXT_PUBLIC_ é necessário para o Next.js expor a variável ao browser
  const codespaceName = process.env.NEXT_PUBLIC_CODESPACE_NAME;
  const backendPort = 4000;

  if (codespaceName) {
    // Estamos no GitHub Codespaces
    return `https://${codespaceName}-${backendPort}.app.github.dev`;
  }

  // Fallback para ambiente local
  return process.env.NEXT_PUBLIC_API_URL || `http://localhost:${backendPort}`;
};

export const API_BASE_URL = getApiBaseUrl();

// Função auxiliar para fazer requisições HTTP
async function apiRequest(endpoint: string, options: RequestInit = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  console.log('Tentando acessar API em:', url);
  
  const config: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  try {
    const response = await fetch(url, config);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
}

// Funções específicas da API
export const api = {
  // Testar conexão com o backend
  ping: () => apiRequest('/api/ping'),
  
  // Testar conexão com o banco de dados
  health: () => apiRequest('/health'),
  
  // Eventos
  getEvents: () => apiRequest('/api/events'),
  createEvent: (data: { name: string; description?: string }) => 
    apiRequest('/api/events', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  
  // Dados do banco para teste
  getDatabaseData: () => apiRequest('/api/database-data'),
};
