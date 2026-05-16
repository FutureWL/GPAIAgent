'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { apiFetch } from '@/lib/api';

type StockItem = {
  code: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume?: number;
  amount?: number;
  turnover?: number;
  circulateCap?: number;
  totalCap?: number;
  netInflow?: number;
};

type WatchlistItem = {
  addedAt: string;
  stock: StockItem;
};

function fmtCap(v: number): string {
  if (v >= 10000) return (v / 10000).toFixed(2) + '万亿';
  if (v >= 1) return v.toFixed(0) + '亿';
  return (v * 10000).toFixed(0) + '万';
}

function fmtAmount(v: number): string {
  if (v >= 10000) return (v / 10000).toFixed(2) + '亿';
  return v.toFixed(0) + '万';
}

export default function WatchlistPage() {
  const router = useRouter();
  const pathname = usePathname();
  const locale = pathname.split('/')[1] || 'zh';

  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<StockItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showLoginTip, setShowLoginTip] = useState(false);

  const loadWatchlist = useCallback(async () => {
    try {
      const data = await apiFetch<WatchlistItem[]>('/api/stocks/user');
      setWatchlist(Array.isArray(data) ? data : []);
    } catch {
      setWatchlist([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadWatchlist(); }, [loadWatchlist]);

  async function refreshQuotes() {
    setRefreshing(true);
    await loadWatchlist();
    setRefreshing(false);
  }

  function handleSearch(q: string) {
    setSearch(q);
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
      await apiFetch('/api/stocks/user', {
        method: 'POST',
        body: JSON.stringify({ stockCode: code }),
      });
      setSearchResults([]);
      setSearch('');
      await loadWatchlist();
    } catch (e: any) {
      if (e?.message?.includes('401') || e?.message?.includes('Unauthorized') || e?.message?.includes('jwt')) {
        setShowLoginTip(true);
      } else {
        setError('添加失败，请重试');
      }
    } finally {
      setAdding(null);
    }
  }

  async function removeStock(code: string) {
    try {
      await apiFetch(`/api/stocks/user?stockCode=${code}`, { method: 'DELETE' });
      await loadWatchlist();
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

      {showLoginTip && (
        <div className="bg-red-900/20 border border-red-800 rounded-xl p-4 text-sm text-red-300">
          请先 <a href={`/${locale}/login`} className="underline">登录</a> 后再添加自选股
        </div>
      )}

      {error && (
        <div className="bg-red-900/20 border border-red-800 rounded-xl p-3 text-sm text-red-300">{error}</div>
      )}

      {/* 搜索添加股票 */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
        <div className="text-sm font-medium mb-3">添加股票</div>
        <div className="flex gap-2">
          <input
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="输入股票代码或名称搜索..."
            className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-slate-500"
          />
          <button
            onClick={() => handleSearch(search)}
            className="bg-blue-600 hover:bg-blue-500 text-white rounded-lg px-4 py-2 text-sm"
          >
            搜索
          </button>
        </div>

        {searching && <div className="mt-2 text-sm text-slate-400">搜索中...</div>}

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
                      {s.price > 0 ? s.price.toFixed(2) : '-'}
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
      </div>

      {/* 自选股列表 */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-700 flex items-center justify-between">
          <h2 className="font-semibold text-sm">我的自选 ({watchlist.length})</h2>
          <button
            onClick={refreshQuotes}
            disabled={refreshing}
            className="text-xs text-slate-400 hover:text-white disabled:opacity-50"
          >
            {refreshing ? '刷新中...' : '刷新'}
          </button>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-400 text-sm">加载中...</div>
        ) : watchlist.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">
            还没有自选股，上方搜索添加
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-slate-400 border-b border-slate-700">
                  <th className="text-left px-4 py-2 font-normal">代码</th>
                  <th className="text-left px-3 py-2 font-normal">名称</th>
                  <th className="text-right px-3 py-2 font-normal">现价</th>
                  <th className="text-right px-3 py-2 font-normal">涨跌</th>
                  <th className="text-right px-3 py-2 font-normal">涨跌幅</th>
                  <th className="text-right px-3 py-2 font-normal">成交额</th>
                  <th className="text-right px-3 py-2 font-normal">换手率</th>
                  <th className="text-right px-3 py-2 font-normal">流通市值</th>
                  <th className="text-right px-3 py-2 font-normal">总市值</th>
                  <th className="text-right px-3 py-2 font-normal">净流入</th>
                  <th className="text-right px-4 py-2 font-normal">操作</th>
                </tr>
              </thead>
              <tbody>
                {watchlist.map((item) => {
                  const s = item.stock;
                  const up = s.change >= 0;
                  return (
                    <tr
                      key={s.code}
                      className="border-b border-slate-800 hover:bg-slate-700/30 cursor-pointer"
                      onClick={() => router.push(`/${locale}/stock/${s.code}`)}
                    >
                      <td className="px-4 py-2.5 text-slate-400">{s.code}</td>
                      <td className="px-3 py-2.5 font-medium">{s.name}</td>
                      <td className="px-3 py-2.5 text-right">{s.price > 0 ? s.price.toFixed(2) : '-'}</td>
                      <td className={`px-3 py-2.5 text-right ${up ? 'text-red-400' : 'text-green-400'}`}>
                        {up ? '+' : ''}{s.change.toFixed(2)}
                      </td>
                      <td className={`px-3 py-2.5 text-right ${up ? 'text-red-400' : 'text-green-400'}`}>
                        {up ? '+' : ''}{s.changePercent.toFixed(2)}%
                      </td>
                      <td className="px-3 py-2.5 text-right text-slate-300">
                        {s.amount ? fmtAmount(s.amount) : '-'}
                      </td>
                      <td className="px-3 py-2.5 text-right text-slate-300">
                        {s.turnover ? s.turnover.toFixed(2) + '%' : '-'}
                      </td>
                      <td className="px-3 py-2.5 text-right text-slate-300">
                        {s.circulateCap ? fmtCap(s.circulateCap) : '-'}
                      </td>
                      <td className="px-3 py-2.5 text-right text-slate-300">
                        {s.totalCap ? fmtCap(s.totalCap) : '-'}
                      </td>
                      <td className={`px-3 py-2.5 text-right ${up ? 'text-red-400' : 'text-green-400'}`}>
                        {s.netInflow ? (up ? '+' : '-') + fmtAmount(Math.abs(s.netInflow)) : '-'}
                      </td>
                      <td className="px-4 py-2.5 text-right" onClick={(e) => e.stopPropagation()}>
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
          </div>
        )}
      </div>
    </div>
  );
}
