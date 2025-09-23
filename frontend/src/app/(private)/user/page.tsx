'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';

export default function UserIndex() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      // não autenticado → login
      router.replace('/login');
    } else {
      // autenticado → redireciona para /user/[nickname]
      router.replace(`/user/${user.nickname}`);
    }
  }, [loading, user, router]);

  // pequeno placeholder enquanto redireciona
  return (
    <div className="min-h-[50vh] flex items-center justify-center text-gray-600">
      Carregando…
    </div>
  );
}
