'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch } from '../../lib/api';

type StockItem = {
  id: string;
  code: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
};

type Me = { id: string; username: string; name: string | null };

export default function WatchlistPage() {
  const [stocks, setStocks] = useState<StockItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<StockItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    apiFetch<Me>('/auth/me')
      .then((data) => { if (!cancelled) setMe(data); })
      .catch(() => { if (!cancelled) setMe(null); });

    apiFetch<StockItem[]>('/user/stocks')
      .then((data) => { if (!cancelled) { setStocks(data ?? []); setLoading(false); } })
      .catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults([]); return; }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await apiFetch<StockItem[]>(`/stocks/search?q=${encodeURIComponent(searchQuery)}`);
        setSearchResults(res ?? []);
      } catch { setSearchResults([]); }
      finally { setSearching(false); }
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  async function addStock(code: string) {
    try {
      await apiFetch('/user/stocks', {
        method: 'POST',
        body: JSON.stringify({ stockCode: code }),
      });
      const data = await apiFetch<StockItem[]>('/user/stocks');
      setStocks(data ?? []);
      setSearchQuery('');
      setSearchResults([]);
    } catch { alert('添加失败'); }
  }

  async function removeStock(id: string) {
    try {
      await apiFetch(`/user/stocks/${id}`, { method: 'DELETE' });
      setStocks((prev) => prev.filter((s) => s.id !== id));
    } catch { alert('移除失败'); }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 text-white">
      <header className="border-b border-slate-700">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-6">
          <Link href="/" className="text-xl font-bold">GPAIAgent</Link>
          <nav className="flex gap-4 text-sm text-slate-300">
            <Link href="/">首页</Link>
            <Link href="/watchlist" className="text-white font-medium">自选</Link>
            <Link href="/membership">会员</Link>
            <Link href="/strategies">策略广场</Link>
          </nav>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-6">
        {!me ? (
          <div className="text-center py-16">
            <div className="text-4xl mb-4">🔒</div>
            <h2 className="text-xl font-semibold mb-2">登录后查看自选股</h2>
            <div className="flex gap-3 justify-center mt-4">
              <Link href="/login" className="bg-white text-slate-900 rounded px-5 py-2 font-medium">登录</Link>
              <Link href="/register" className="border border-slate-500 rounded px-5 py-2">注册</Link>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <h2 className="text-lg font-semibold mb-3">添加自选股</h2>
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="输入股票代码或名称搜索..."
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2.5 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-slate-400"
                />
                {searchResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-slate-800 border border-slate-600 rounded-lg overflow-hidden z-10 shadow-xl">
                    {searchResults.map((s) => (
                      <button
                        key={s.code}
                        onClick={() => addStock(s.code)}
                        className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-slate-700 text-left text-sm"
                      >
                        <span><span className="text-slate-400 mr-2">{s.code}</span>{s.name}</span>
                        <span className={`text-xs ${s.change >= 0 ? 'text-red-400' : 'text-green-400'}`}>
                          {s.change >= 0 ? '+' : ''}{s.changePercent.toFixed(2)}%
                        </span>
                      </button>
                    ))}
                  </div>
                )}
                {searching && <div className="mt-2 text-xs text-slate-400">搜索中...</div>}
              </div>
            </div>

            <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-700">
                <h2 className="font-semibold text-sm">我的自选（{stocks.length}）</h2>
              </div>
              {loading ? (
                <div className="p-6 text-slate-400 text-sm">加载中...</div>
              ) : stocks.length === 0 ? (
                <div className="p-6 text-slate-400 text-sm text-center">暂无自选股，搜索上方股票添加</div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-slate-400 text-xs border-b border-slate-700">
                      <th className="text-left px-4 py-2 font-normal">代码</th>
                      <th className="text-left px-4 py-2 font-normal">名称</th>
                      <th className="text-right px-4 py-2 font-normal">现价</th>
                      <th className="text-right px-4 py-2 font-normal">涨跌额</th>
                      <th className="text-right px-4 py-2 font-normal">涨跌幅</th>
                      <th className="px-4 py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {stocks.map((s) => {
                      const up = s.change >= 0;
                      return (
                        <tr key={s.id} className="border-b border-slate-800 hover:bg-slate-700/30">
                          <td className="px-4 py-2.5 text-slate-400">{s.code}</td>
                          <td className="px-4 py-2.5 font-medium">{s.name}</td>
                          <td className="px-4 py-2.5 text-right">{s.price.toFixed(2)}</td>
                          <td className={`px-4 py-2.5 text-right ${up ? 'text-red-400' : 'text-green-400'}`}>
                            {up ? '+' : ''}{s.change.toFixed(2)}
                          </td>
                          <td className={`px-4 py-2.5 text-right ${up ? 'text-red-400' : 'text-green-400'}`}>
                            {up ? '+' : ''}{s.changePercent.toFixed(2)}%
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            <button onClick={() => removeStock(s.id)} className="text-xs text-slate-400 hover:text-red-400 transition-colors">移除</button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
