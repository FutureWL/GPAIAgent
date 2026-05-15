'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { apiFetch } from '@/lib/api';

export default function RegisterPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await apiFetch('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });
      router.replace('/');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : '注册失败');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 text-white flex items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-xl bg-slate-900/40 border border-slate-700 p-6">
        <h1 className="text-2xl font-semibold">注册</h1>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <label className="block">
            <div className="text-sm text-slate-300">用户名</div>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="mt-1 w-full rounded-md bg-slate-950/50 border border-slate-700 px-3 py-2 outline-none focus:border-slate-500"
              autoComplete="username"
            />
          </label>

          <label className="block">
            <div className="text-sm text-slate-300">密码（至少 6 位）</div>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              className="mt-1 w-full rounded-md bg-slate-950/50 border border-slate-700 px-3 py-2 outline-none focus:border-slate-500"
              autoComplete="new-password"
            />
          </label>

          {error ? <div className="text-sm text-red-300">{error}</div> : null}

          <button
            disabled={loading}
            className="w-full rounded-md bg-white text-slate-900 py-2 font-medium disabled:opacity-60"
          >
            {loading ? '注册中...' : '注册并登录'}
          </button>
        </form>

        <div className="mt-4 text-sm text-slate-300">
          已经有账号？{' '}
          <Link href="/login" className="text-white underline underline-offset-4">
            去登录
          </Link>
        </div>
      </div>
    </main>
  );
}
