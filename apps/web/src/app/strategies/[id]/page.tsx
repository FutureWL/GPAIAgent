'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { apiFetch } from '../../../lib/api';

type StrategyDetail = {
  id: string;
  title: string;
  description: string;
  content: string;
  tags: string[];
  viewCount: number;
  likeCount: number;
  liked: boolean;
  createdAt: string;
  author: { id: string; username: string; name: string | null; avatar: string | null };
};

type Comment = {
  id: string;
  content: string;
  createdAt: string;
  author: { id: string; username: string; name: string | null; avatar: string | null };
};

type Backtest = {
  id: string;
  name: string;
  params: Record<string, unknown>;
  result: Record<string, unknown>;
  summary: string | null;
  createdAt: string;
};

type Me = { id: string; username: string; name: string | null; avatar: string | null };

export default function StrategyDetailPage() {
  const params = useParams<{ id: string }>();
  const id = typeof params.id === 'string' ? params.id : '';
  const [data, setData] = useState<StrategyDetail | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [backtests, setBacktests] = useState<Backtest[]>([]);
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [likeLoading, setLikeLoading] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [backtestName, setBacktestName] = useState('');
  const [backtestSummary, setBacktestSummary] = useState('');
  const [submittingBacktest, setSubmittingBacktest] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.all([
      apiFetch<StrategyDetail>(`/strategies/${id}`),
      apiFetch<Comment[]>(`/strategies/${id}/comments`),
      apiFetch<Backtest[]>(`/strategies/${id}/backtests`),
      apiFetch<Me>('/auth/me').catch(() => null),
    ])
      .then(([strategyData, commentsData, backtestsData, meData]) => {
        if (!cancelled) {
          setData(strategyData);
          setComments(commentsData);
          setBacktests(backtestsData);
          setMe(meData);
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : '加载失败');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    apiFetch(`/strategies/${id}/view`, { method: 'POST' }).catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [id]);

  async function toggleLike() {
    if (!data || likeLoading) return;
    setLikeLoading(true);
    try {
      if (data.liked) {
        const result = await apiFetch<{ liked: boolean; likeCount: number }>(`/strategies/${id}/like`, { method: 'DELETE' });
        setData((prev) => prev && { ...prev, liked: result.liked, likeCount: result.likeCount });
      } else {
        const result = await apiFetch<{ liked: boolean; likeCount: number }>(`/strategies/${id}/like`, { method: 'POST' });
        setData((prev) => prev && { ...prev, liked: result.liked, likeCount: result.likeCount });
      }
    } catch (err) {
      // If unauthorized, redirect to login
      const msg = err instanceof Error ? err.message : '';
      if (msg.toLowerCase().includes('login') || msg.toLowerCase().includes('unauthorized')) {
        window.location.href = '/login';
      }
    } finally {
      setLikeLoading(false);
    }
  }

  async function submitComment(e: React.FormEvent) {
    e.preventDefault();
    if (!commentText.trim() || submittingComment) return;
    setSubmittingComment(true);
    try {
      const comment = await apiFetch<Comment>(`/strategies/${id}/comments`, {
        method: 'POST',
        body: JSON.stringify({ content: commentText.trim() }),
      });
      setComments((prev) => [...prev, comment]);
      setCommentText('');
    } catch {
      // ignore error
    } finally {
      setSubmittingComment(false);
    }
  }

  async function submitBacktest(e: React.FormEvent) {
    e.preventDefault();
    if (!backtestName.trim() || submittingBacktest) return;
    setSubmittingBacktest(true);
    try {
      const bt = await apiFetch<Backtest>(`/strategies/${id}/backtests`, {
        method: 'POST',
        body: JSON.stringify({ name: backtestName.trim(), summary: backtestSummary.trim() || undefined }),
      });
      setBacktests((prev) => [bt, ...prev]);
      setBacktestName('');
      setBacktestSummary('');
    } catch {
      // ignore error
    } finally {
      setSubmittingBacktest(false);
    }
  }

  const isAuthor = me && data && me.id === data.author.id;

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 text-white p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between gap-4">
          <Link href="/strategies" className="text-slate-300 underline underline-offset-4">
            返回列表
          </Link>
          {me ? (
            <Link href="/strategies/new" className="rounded-md bg-white text-slate-900 px-4 py-2 font-medium">
              发布策略
            </Link>
          ) : (
            <div className="flex gap-3">
              <Link href="/login" className="rounded-md border border-slate-500 text-slate-300 px-4 py-2 font-medium">
                登录
              </Link>
              <Link href="/register" className="rounded-md bg-white text-slate-900 px-4 py-2 font-medium">
                注册
              </Link>
            </div>
          )}
        </div>

        {loading ? <div className="mt-6 text-slate-400">加载中...</div> : null}
        {error ? <div className="mt-6 text-red-300">{error}</div> : null}

        {data ? (
          <>
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

              <div className="mt-4 flex items-center gap-4 text-sm text-slate-400">
                <span>作者：{data.author.name ?? data.author.username}</span>
                <span>浏览 {data.viewCount}</span>
                <button
                  onClick={toggleLike}
                  disabled={likeLoading}
                  className={`flex items-center gap-1 transition-colors ${
                    data.liked ? 'text-red-400' : 'text-slate-400 hover:text-red-300'
                  } disabled:opacity-60`}
                >
                  <span>{data.liked ? '♥' : '♡'}</span>
                  <span>{data.likeCount}</span>
                </button>
              </div>

              <div className="mt-6">
                <div className="text-sm text-slate-300 mb-2">正文</div>
                <div className="rounded-lg bg-slate-950/40 border border-slate-800 p-4 markdown-body">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {data.content}
                  </ReactMarkdown>
                </div>
              </div>
            </div>

            {/* 回测区域 */}
            <div className="mt-8">
              <h2 className="text-xl font-semibold mb-4">回测记录 ({backtests.length})</h2>

              {isAuthor ? (
                <form onSubmit={submitBacktest} className="mb-6 space-y-3">
                  <input
                    value={backtestName}
                    onChange={(e) => setBacktestName(e.target.value)}
                    placeholder="回测名称，如：2024年1月-6月"
                    className="w-full rounded-md bg-slate-950/50 border border-slate-700 px-3 py-2 outline-none focus:border-slate-500 text-white"
                  />
                  <input
                    value={backtestSummary}
                    onChange={(e) => setBacktestSummary(e.target.value)}
                    placeholder="简要总结（可选）"
                    className="w-full rounded-md bg-slate-950/50 border border-slate-700 px-3 py-2 outline-none focus:border-slate-500 text-white"
                  />
                  <button
                    type="submit"
                    disabled={submittingBacktest || !backtestName.trim()}
                    className="rounded-md bg-white text-slate-900 px-4 py-2 font-medium disabled:opacity-60"
                  >
                    {submittingBacktest ? '添加中...' : '添加回测记录'}
                  </button>
                </form>
              ) : null}

              {backtests.length === 0 ? (
                <p className="text-slate-400">暂无回测记录</p>
              ) : (
                <div className="space-y-4">
                  {backtests.map((bt) => (
                    <div key={bt.id} className="rounded-lg bg-slate-900/40 border border-slate-700 p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-white font-medium">{bt.name}</span>
                        <span className="text-xs text-slate-500">
                          {new Date(bt.createdAt).toLocaleString('zh-CN')}
                        </span>
                      </div>
                      {bt.summary ? (
                        <p className="text-slate-300 text-sm">{bt.summary}</p>
                      ) : null}
                      {Object.keys(bt.result).length > 0 ? (
                        <pre className="mt-2 text-xs bg-slate-950/60 rounded p-2 overflow-x-auto text-slate-400">
                          {JSON.stringify(bt.result, null, 2)}
                        </pre>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 评论区域 */}
            <div className="mt-8">
              <h2 className="text-xl font-semibold mb-4">评论 ({comments.length})</h2>

              {me ? (
                <form onSubmit={submitComment} className="mb-6">
                  <textarea
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="写下你的评论..."
                    rows={3}
                    className="w-full rounded-md bg-slate-950/50 border border-slate-700 px-3 py-2 outline-none focus:border-slate-500 text-white"
                  />
                  <button
                    type="submit"
                    disabled={submittingComment || !commentText.trim()}
                    className="mt-2 rounded-md bg-white text-slate-900 px-4 py-2 font-medium disabled:opacity-60"
                  >
                    {submittingComment ? '发送中...' : '发送'}
                  </button>
                </form>
              ) : (
                <p className="mb-6 text-slate-400">
                  <Link href="/login" className="underline">登录</Link>后可发表评论
                </p>
              )}

              {comments.length === 0 ? (
                <p className="text-slate-400">暂无评论</p>
              ) : (
                <div className="space-y-4">
                  {comments.map((c) => (
                    <div key={c.id} className="rounded-lg bg-slate-900/40 border border-slate-700 p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-medium text-white">
                          {c.author.name ?? c.author.username}
                        </span>
                        <span className="text-xs text-slate-500">
                          {new Date(c.createdAt).toLocaleString('zh-CN')}
                        </span>
                      </div>
                      <div className="text-slate-200 whitespace-pre-wrap">{c.content}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : null}
      </div>
    </main>
  );
}
