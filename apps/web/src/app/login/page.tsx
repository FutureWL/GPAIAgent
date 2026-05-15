'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username, password }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { message?: string }).message || '登录失败');
      }

      // 用 Next.js router 导航，强制刷新
      await router.push('/home');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : '登录失败');
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 text-white flex items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-xl bg-slate-900/40 border border-slate-700 p-6">
        <h1 className="text-2xl font-semibold">登录</h1>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <label className="block">
            <div className="text-sm text-slate-300">用户名</div>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="mt-1 w-full rounded-md bg-slate-950/50 border border-slate-700 px-3 py-2 outline-none focus:border-slate-500"
              autoComplete="username"
              required
            />
          </label>

          <label className="block">
            <div className="text-sm text-slate-300">密码</div>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              className="mt-1 w-full rounded-md bg-slate-950/50 border border-slate-700 px-3 py-2 outline-none focus:border-slate-500"
              autoComplete="current-password"
              required
            />
          </label>

          {error ? <div className="text-sm text-red-300">{error}</div> : null}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-white text-slate-900 py-2 font-medium disabled:opacity-60"
          >
            {loading ? '登录中...' : '登录'}
          </button>
        </form>

        <div className="mt-4 text-sm text-slate-300">
          还没有账号？
          <Link href="/register" className="text-white underline underline-offset-4">
            去注册
          </Link>
        </div>
      </div>
    </main>
  );
}
