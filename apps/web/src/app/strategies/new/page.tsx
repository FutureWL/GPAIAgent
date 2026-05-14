'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { apiFetch } from '../../../lib/api';

type Created = { id: string };

export default function NewStrategyPage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tagsText, setTagsText] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Let guests view the page; redirect to login only when they try to submit
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    // Check auth before submitting
    const me = await apiFetch<{ id: string }>('/auth/me').catch(() => null);
    if (!me) {
      router.replace('/login');
      return;
    }

    const tags = tagsText
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    try {
      const created = await apiFetch<Created>('/strategies', {
        method: 'POST',
        body: JSON.stringify({ title, description, content, tags }),
      });
      router.replace(`/strategies/${created.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : '发布失败');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 text-white p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-3xl font-semibold">发布策略</h1>
          <Link href="/strategies" className="text-slate-300 underline underline-offset-4">
            返回列表
          </Link>
        </div>

        <form onSubmit={onSubmit} className="mt-6 space-y-5">
          <label className="block">
            <div className="text-sm text-slate-300">标题</div>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 w-full rounded-md bg-slate-950/50 border border-slate-700 px-3 py-2 outline-none focus:border-slate-500"
            />
          </label>

          <label className="block">
            <div className="text-sm text-slate-300">简介</div>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1 w-full rounded-md bg-slate-950/50 border border-slate-700 px-3 py-2 outline-none focus:border-slate-500"
            />
          </label>

          <label className="block">
            <div className="text-sm text-slate-300">标签（逗号分隔）</div>
            <input
              value={tagsText}
              onChange={(e) => setTagsText(e.target.value)}
              placeholder="短线, 技术面"
              className="mt-1 w-full rounded-md bg-slate-950/50 border border-slate-700 px-3 py-2 outline-none focus:border-slate-500"
            />
          </label>

          <label className="block">
            <div className="text-sm text-slate-300">正文（支持 Markdown 纯文本）</div>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={12}
              className="mt-1 w-full rounded-md bg-slate-950/50 border border-slate-700 px-3 py-2 outline-none focus:border-slate-500"
            />
          </label>

          {error ? <div className="text-sm text-red-300">{error}</div> : null}

          <button
            disabled={loading}
            className="rounded-md bg-white text-slate-900 px-5 py-2 font-medium disabled:opacity-60"
          >
            {loading ? '发布中...' : '发布'}
          </button>
        </form>
      </div>
    </main>
  );
}
