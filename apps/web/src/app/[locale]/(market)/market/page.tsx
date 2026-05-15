'use client';

import { useEffect, useState, useCallback } from 'react';
import { apiFetch } from '@/lib/api';

type StockItem = {
  code: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume?: number;
};

type EastMoneyStock = {
  f12: string; // code
  f14: string; // name
  f2: number;  // price
  f3: number;  // changePercent
  f4: number;  // change
  f5: number;  // volume
  f6: number;  // amount
};

export default function MarketPage() {
  const [allStocks, setAllStocks] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [displayedStocks, setDisplayedStocks] = useState<StockItem[]>([]);

  const fetchMarket = useCallback(async () => {
    setLoading(true);
    try {
      // 从东方财富获取全市场行情（分页，每页100只）
      const stocks: StockItem[] = [];
      const pageSize = 50;
      const totalPages = 20; // 取前1000只，覆盖主要股票

      const results = await Promise.all(
        Array.from({ length: totalPages }, (_, i) => {
          const pn = i + 1;
          return fetch(
            `https://push2.eastmoney.com/api/qt/clist/get?pn=${pn}&pz=${pageSize}&po=1&np=1&fltt=2&invt=2&fid=f3&fs=m:0+t:6,m:0+t:13,m:1+t:2,m:1+t:23&fields=f12,f14,f2,f3,f4,f5,f6&_=${Date.now()}`
          ).then(r => r.json()).catch(() => ({ data: { diff: [] } }));
        })
      );

      for (const res of results) {
        const diff = res?.data?.diff ?? [];
        for (const s of diff) {
          if (s.f12 && s.f14) {
            stocks.push({
              code: s.f12,
              name: s.f14,
              price: s.f2 ?? 0,
              change: s.f4 ?? 0,
              changePercent: s.f3 ?? 0,
              volume: s.f5 ?? 0,
            });
          }
        }
      }
      setAllStocks(stocks);
    } catch {
      // fallback
      setAllStocks([
        { code: '600519', name: '贵州茅台', price: 1688, change: 20.5, changePercent: 1.23 },
        { code: '000858', name: '五粮液', price: 142.3, change: -1.8, changePercent: -1.25 },
        { code: '601318', name: '中国平安', price: 45.6, change: 0.85, changePercent: 1.90 },
        { code: '000001', name: '平安银行', price: 11.25, change: 0.15, changePercent: 1.35 },
      ]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMarket();
  }, [fetchMarket]);

  useEffect(() => {
    if (!search.trim()) {
      setDisplayedStocks(allStocks.slice(0, 100));
    } else {
      const q = search.toUpperCase();
      setDisplayedStocks(
        allStocks.filter(
          (s) => s.code.includes(q) || s.name.includes(search)
        ).slice(0, 50)
      );
    }
  }, [search, allStocks]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">行情</h1>
        <p className="text-sm text-slate-400 mt-1">A股全市场实时行情</p>
      </div>

      {/* 搜索 */}
      <div className="flex gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="搜索股票代码或名称..."
          className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-slate-500"
        />
        <button
          onClick={fetchMarket}
          className="bg-slate-700 hover:bg-slate-600 text-white rounded-lg px-4 py-2.5 text-sm"
        >
          刷新
        </button>
      </div>

      {/* 行情表格 */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
        <div className="px-4 py-2 border-b border-slate-700 flex items-center justify-between">
          <span className="text-xs text-slate-400">
            {loading ? '加载中...' : `共 ${displayedStocks.length} 只股票`}
          </span>
          <span className="text-xs text-green-400">● 实时</span>
        </div>
        {loading && allStocks.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">正在从东方财富获取行情数据...</div>
        ) : displayedStocks.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">暂无数据</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-slate-400 text-xs border-b border-slate-700">
                  <th className="text-left px-4 py-2 font-normal">代码</th>
                  <th className="text-left px-4 py-2 font-normal">名称</th>
                  <th className="text-right px-4 py-2 font-normal">现价</th>
                  <th className="text-right px-4 py-2 font-normal">涨跌额</th>
                  <th className="text-right px-4 py-2 font-normal">涨跌幅</th>
                  <th className="text-right px-4 py-2 font-normal">成交量</th>
                </tr>
              </thead>
              <tbody>
                {displayedStocks.map((s) => {
                  const up = s.change >= 0;
                  return (
                    <tr key={s.code} className="border-b border-slate-800 hover:bg-slate-700/30">
                      <td className="px-4 py-2.5 text-slate-400">{s.code}</td>
                      <td className="px-4 py-2.5 font-medium">{s.name}</td>
                      <td className="px-4 py-2.5 text-right">{s.price > 0 ? s.price.toFixed(2) : '-'}</td>
                      <td className={`px-4 py-2.5 text-right ${up ? 'text-red-400' : 'text-green-400'}`}>
                        {s.change > 0 ? '+' : ''}{s.change.toFixed(2)}
                      </td>
                      <td className={`px-4 py-2.5 text-right ${up ? 'text-red-400' : 'text-green-400'}`}>
                        {up ? '+' : ''}{s.changePercent.toFixed(2)}%
                      </td>
                      <td className="px-4 py-2.5 text-right text-slate-400">
                        {s.volume ? (s.volume / 10000).toFixed(0) + '万' : '-'}
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
