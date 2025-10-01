// Configuração da API para comunicação com o backend

const getApiBaseUrl = () => {
  // URL do backend no Codespace. O nome foi extraído de screenshots anteriores.
  return 'https://congenial-space-system-jjq5455jx6r72q955-4000.app.github.dev';
};

export const API_BASE_URL = getApiBaseUrl();

// Função auxiliar para fazer requisições HTTP
export async function apiRequest(endpoint: string, options: RequestInit = {}) {
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
