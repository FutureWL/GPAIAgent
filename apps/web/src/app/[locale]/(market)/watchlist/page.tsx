'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';

type StockItem = {
  id?: string;
  code: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume?: number;
};

type WatchlistItem = {
  addedAt: string;
  stock: StockItem;
};

export default function WatchlistPage() {
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<StockItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function loadWatchlist() {
    setLoading(true);
    apiFetch<WatchlistItem[]>('/stocks/user')
      .then(setWatchlist)
      .catch(() => setWatchlist([]))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadWatchlist();
  }, []);

  function handleSearch(q: string) {
    if (!q.trim()) { setSearchResults([]); return; }
    setSearching(true);
    apiFetch<StockItem[]>(`/stocks/search?q=${encodeURIComponent(q)}`)
      .then(setSearchResults)
      .catch(() => setSearchResults([]))
      .finally(() => setSearching(false));
  }

  async function addStock(code: string) {
    setAdding(code);
    setError(null);
    try {
      await apiFetch('/stocks/user', {
        method: 'POST',
        body: JSON.stringify({ stockCode: code }),
      });
      setSearchResults([]);
      setSearch('');
      loadWatchlist();
    } catch (e) {
      setError('添加失败，请重试');
    } finally {
      setAdding(null);
    }
  }

  async function removeStock(code: string) {
    try {
      await apiFetch(`/stocks/user/${code}`, { method: 'DELETE' });
      loadWatchlist();
    } catch {
      // ignore
    }
  }

  const watchedCodes = new Set(watchlist.map((w) => w.stock.code));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold">自选股</h1>
        <p className="text-sm text-slate-400 mt-1">添加关注的股票，实时掌握行情</p>
      </div>

      {/* 搜索添加股票 */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
        <div className="text-sm font-medium mb-3">添加股票</div>
        <div className="flex gap-2">
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); handleSearch(e.target.value); }}
            placeholder="输入股票代码或名称，按回车搜索..."
            className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-slate-500"
          />
        </div>

        {/* 搜索结果 */}
        {searching && (
          <div className="mt-2 text-sm text-slate-400">搜索中...</div>
        )}
        {searchResults.length > 0 && (
          <div className="mt-2 border border-slate-700 rounded-lg overflow-hidden">
            {searchResults.map((s) => {
              const up = s.change >= 0;
              return (
                <div key={s.code} className="flex items-center justify-between px-3 py-2.5 hover:bg-slate-700/50 border-b border-slate-800 last:border-b-0">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{s.name}</span>
                      <span className="text-xs text-slate-400">{s.code}</span>
                      <span className={`text-xs ${up ? 'text-red-400' : 'text-green-400'}`}>
                        {up ? '+' : ''}{s.changePercent.toFixed(2)}%
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <span className={`text-sm ${up ? 'text-red-400' : 'text-green-400'}`}>
                      {s.price.toFixed(2)}
                    </span>
                    {watchedCodes.has(s.code) ? (
                      <span className="text-xs text-slate-500">已添加</span>
                    ) : (
                      <button
                        onClick={() => addStock(s.code)}
                        disabled={adding === s.code}
                        className="text-xs bg-blue-600 hover:bg-blue-500 text-white rounded px-3 py-1 disabled:opacity-50"
                      >
                        {adding === s.code ? '添加中...' : '添加'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {error && <div className="mt-2 text-sm text-red-400">{error}</div>}
      </div>

      {/* 自选股列表 */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-700">
          <h2 className="font-semibold text-sm">我的自选 ({watchlist.length})</h2>
        </div>
        {loading ? (
          <div className="p-8 text-center text-slate-400 text-sm">加载中...</div>
        ) : watchlist.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">
            还没有自选股，上方搜索添加
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-slate-400 text-xs border-b border-slate-700">
                <th className="text-left px-4 py-2 font-normal">代码</th>
                <th className="text-left px-4 py-2 font-normal">名称</th>
                <th className="text-right px-4 py-2 font-normal">现价</th>
                <th className="text-right px-4 py-2 font-normal">涨跌额</th>
                <th className="text-right px-4 py-2 font-normal">涨跌幅</th>
                <th className="text-right px-4 py-2 font-normal">操作</th>
              </tr>
            </thead>
            <tbody>
              {watchlist.map((item) => {
                const s = item.stock;
                const up = s.change >= 0;
                return (
                  <tr key={s.code} className="border-b border-slate-800 hover:bg-slate-700/30">
                    <td className="px-4 py-3 text-slate-400">{s.code}</td>
                    <td className="px-4 py-3 font-medium">{s.name}</td>
                    <td className="px-4 py-3 text-right">{s.price.toFixed(2)}</td>
                    <td className={`px-4 py-3 text-right ${up ? 'text-red-400' : 'text-green-400'}`}>
                      {up ? '+' : ''}{s.change.toFixed(2)}
                    </td>
                    <td className={`px-4 py-3 text-right ${up ? 'text-red-400' : 'text-green-400'}`}>
                      {up ? '+' : ''}{s.changePercent.toFixed(2)}%
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => removeStock(s.code)}
                        className="text-xs text-red-400 hover:text-red-300"
                      >
                        删除
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
