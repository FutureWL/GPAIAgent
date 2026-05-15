'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';

type Me = { id: string; username: string; name: string | null; avatar: string | null };

export function useAuth(requireAuth = true) {
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchMe = useCallback(async () => {
    try {
      const data = await apiFetch<Me>('/auth/me');
      setMe(data);
      return data;
    } catch {
      setMe(null);
      return null;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiFetch('/auth/logout', { method: 'POST' });
    } catch {
      // ignore
    }
    setMe(null);
    router.push('/login');
    router.refresh();
  }, [router]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchMe().then((user) => {
      if (cancelled) return;
      setLoading(false);
      if (requireAuth && !user) {
        router.push('/login');
      }
    });
    return () => {
      cancelled = true;
    };
  }, [fetchMe, requireAuth, router]);

  return { me, loading, logout, refetch: fetchMe };
}
