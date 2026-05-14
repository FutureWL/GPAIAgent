'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { apiFetch } from '../../../lib/api';

type StrategyDetail = {
  id: string;
  title: string;
  description: string;
  content: string;
  tags: string[];
  viewCount: number;
  createdAt: string;
  author: { id: string; username: string; name: string | null; avatar: string | null };
};

export default function StrategyDetailPage() {
  const params = useParams<{ id: string }>();
  const id = typeof params.id === 'string' ? params.id : '';
  const [data, setData] = useState<StrategyDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    apiFetch<StrategyDetail>(`/strategies/${id}`)
      .then((d) => {
        if (!cancelled) setData(d);
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
  }, [id]);

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 text-white p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between gap-4">
          <Link href="/strategies" className="text-slate-300 underline underline-offset-4">
            返回列表
          </Link>
          <Link href="/strategies/new" className="rounded-md bg-white text-slate-900 px-4 py-2 font-medium">
            发布策略
          </Link>
        </div>

        {loading ? <div className="mt-6 text-slate-400">加载中...</div> : null}
        {error ? <div className="mt-6 text-red-300">{error}</div> : null}

        {data ? (
          <div className="mt-6 rounded-xl bg-slate-900/40 border border-slate-700 p-6">
            <h1 className="text-3xl font-semibold">{data.title}</h1>
            <div className="mt-2 text-slate-300">{data.description}</div>

            <div className="mt-3 flex flex-wrap gap-2">
              {data.tags.map((t) => (
                <span key={t} className="text-xs rounded-full border border-slate-600 px-2 py-1 text-slate-200">
                  {t}
                </span>
              ))}
            </div>

            <div className="mt-4 text-sm text-slate-400">
              作者：{data.author.name ?? data.author.username} · 浏览 {data.viewCount}
            </div>

            <div className="mt-6">
              <div className="text-sm text-slate-300 mb-2">正文</div>
              <div className="rounded-lg bg-slate-950/40 border border-slate-800 p-4 whitespace-pre-wrap leading-7">
                {data.content}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
}
