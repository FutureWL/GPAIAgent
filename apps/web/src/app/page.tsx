'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { apiFetch } from '../lib/api';

type Me = { id: string; username: string; name: string | null; avatar: string | null };

export default function HomePage() {
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    apiFetch<Me>('/auth/me')
      .then((data) => {
        if (!cancelled) setMe(data);
      })
      .catch(() => {
        if (!cancelled) setMe(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function logout() {
    await apiFetch('/auth/logout', { method: 'POST' });
    setMe(null);
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 text-white flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-5xl font-bold mb-4">GPAIAgent</h1>
        <p className="text-xl text-slate-300">短线炒股辅助平台</p>
        <div className="mt-4">
          <Link href="/strategies" className="text-slate-300 underline underline-offset-4">
            进入策略广场
          </Link>
        </div>
        <div className="mt-6 text-slate-300">
          {loading ? (
            <div className="text-slate-400">加载中...</div>
          ) : me ? (
            <div className="space-y-3">
              <div>
                已登录：<span className="text-white font-medium">{me.username}</span>
              </div>
              <button
                onClick={logout}
                className="rounded-md bg-white text-slate-900 px-4 py-2 font-medium"
              >
                退出登录
              </button>
            </div>
          ) : (
            <div className="space-x-3">
              <Link href="/login" className="rounded-md bg-white text-slate-900 px-4 py-2 font-medium">
                登录
              </Link>
              <Link
                href="/register"
                className="rounded-md border border-slate-500 px-4 py-2 font-medium text-white"
              >
                注册
              </Link>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
