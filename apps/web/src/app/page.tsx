'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';

type Me = { id: string; username: string; name: string | null; avatar: string | null };

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    apiFetch<Me>('/auth/me')
      .then((user) => {
        if (user) {
          router.replace('/home');
        } else {
          router.replace('/login');
        }
      })
      .catch(() => {
        router.replace('/login');
      });
  }, [router]);

  return (
    <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">
      <div className="text-slate-400">加载中...</div>
    </div>
  );
}
