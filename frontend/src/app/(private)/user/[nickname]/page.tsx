'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '../../../../lib/auth';
import { API_BASE_URL } from '../../../../lib/api';
import Header from '@/app/components/Header';

interface UserProfile {
  id: number;
  first_name: string;
  last_name: string;
  nickname: string;
  email: string;
  created_at: string;
}

export default function UserProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { user: currentUser, token, loading: authLoading } = useAuth();
  const [profileUser, setProfileUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const nickname = params.nickname as string;

  useEffect(() => {
    if (authLoading) return;
    
    if (!currentUser || !token) {
      router.push('/login');
      return;
    }

    fetchUserProfile();
  }, [nickname, currentUser, token, authLoading]);

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      setError(null);

            const response = await fetch(`${API_BASE_URL}/api/user/${nickname}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          setError('Usuário não encontrado');
        } else {
          setError('Erro ao carregar perfil do usuário');
        }
        return;
      }

      const data = await response.json();
      setProfileUser(data.user);
    } catch (error) {
      console.error('Erro ao buscar perfil:', error);
      setError('Erro ao carregar perfil do usuário');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando perfil...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
          <button
            onClick={() => router.back()}
            className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Voltar
          </button>
        </div>
      </div>
    );
  }

  if (!profileUser) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Usuário não encontrado</p>
        </div>
      </div>
    );
  }

  const isOwnProfile = currentUser?.id === profileUser.id;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header/>
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Header do Perfil */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center space-x-6">
            {/* Avatar */}
            <div className="w-24 h-24 bg-blue-600 rounded-full flex items-center justify-center">
              <span className="text-3xl font-bold text-white">
                {profileUser.first_name.charAt(0).toUpperCase()}
              </span>
            </div>
            
            {/* Informações do Usuário */}
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 font-serif">
                {profileUser.first_name} {profileUser.last_name}
              </h1>
              <p className="text-gray-600 mt-1">@{profileUser.nickname}</p>
              {isOwnProfile && (
                <p className="text-sm text-gray-500 mt-2">{profileUser.email}</p>
              )}
              <p className="text-sm text-gray-500 mt-1">
                Membro desde {new Date(profileUser.created_at).toLocaleDateString('pt-BR')}
              </p>
            </div>

            {/* Ações */}
            <div className="flex flex-col space-y-2">
              {isOwnProfile ? (
                <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-serif">
                  Editar Perfil
                </button>
              ) : (
                <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-serif">
                  Seguir
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Conteúdo do Perfil */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Coluna Principal */}
          <div className="lg:col-span-2 space-y-6">
            {/* Sobre */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4 font-serif">Sobre</h2>
              <p className="text-gray-600">
                {isOwnProfile 
                  ? "Esta é a sua página de perfil. Aqui você pode ver suas informações e atividades."
                  : `Perfil de ${profileUser.first_name} ${profileUser.last_name}. Membro da comunidade Vlib.`
                }
              </p>
            </div>

            {/* Atividade Recente */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4 font-serif">Atividade Recente</h2>
              <div className="text-center py-8">
                <p className="text-gray-500">Nenhuma atividade recente</p>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Estatísticas */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4 font-serif">Estatísticas</h2>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">Livros Lidos</span>
                  <span className="font-semibold">0</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Resenhas</span>
                  <span className="font-semibold">0</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Seguidores</span>
                  <span className="font-semibold">0</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Seguindo</span>
                  <span className="font-semibold">0</span>
                </div>
              </div>
            </div>

            {/* Livros Favoritos */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4 font-serif">Livros Favoritos</h2>
              <div className="text-center py-8">
                <p className="text-gray-500">Nenhum livro favorito ainda</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
