'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/api';

type StrategyListItem = {
  id: string;
  title: string;
  description: string;
  tags: string[];
  viewCount: number;
  createdAt: string;
  author: { id: string; username: string; name: string | null; avatar: string | null };
};

export default function StrategiesPage() {
  const [items, setItems] = useState<StrategyListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    apiFetch<StrategyListItem[]>('/strategies')
      .then((data) => {
        if (!cancelled) setItems(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : '加载失败');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 text-white p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-3xl font-semibold">策略广场</h1>
          <Link href="/strategies/new" className="rounded-md bg-white text-slate-900 px-4 py-2 font-medium">
            发布策略
          </Link>
        </div>

        {loading ? <div className="mt-6 text-slate-400">加载中...</div> : null}
        {error ? <div className="mt-6 text-red-300">{error}</div> : null}

        {!loading && !error && items.length === 0 ? (
          <div className="mt-6 text-slate-400">暂无策略，去发布第一个吧。</div>
        ) : null}

        <div className="mt-6 space-y-4">
          {items.map((item) => (
            <Link
              key={item.id}
              href={`/strategies/${item.id}`}
              className="block rounded-xl bg-slate-900/40 border border-slate-700 p-5 hover:border-slate-500 transition-colors"
            >
              <div className="text-xl font-semibold">{item.title}</div>
              <div className="mt-2 text-slate-300">{item.description}</div>
              <div className="mt-3 flex flex-wrap gap-2">
                {item.tags.map((t) => (
                  <span key={t} className="text-xs rounded-full border border-slate-600 px-2 py-1 text-slate-200">
                    {t}
                  </span>
                ))}
              </div>
              <div className="mt-4 text-sm text-slate-400">
                作者：{item.author.name ?? item.author.username} · 浏览 {item.viewCount}
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-10">
          <Link href="/" className="text-slate-300 underline underline-offset-4">
            返回首页
          </Link>
        </div>
      </div>
    </main>
  );
}
