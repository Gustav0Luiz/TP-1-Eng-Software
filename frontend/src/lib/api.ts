// Configuração da API para comunicação com o backend

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

// Função auxiliar para fazer requisições HTTP
async function apiRequest(endpoint: string, options: RequestInit = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  
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
