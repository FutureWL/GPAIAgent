'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type StockItem = {
  code: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
};

type HomeContentProps = {
  username: string;
};

export default function HomeContent({ username }: HomeContentProps) {
  const [stocks, setStocks] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    Promise.all([
      fetch('/stocks/search?q=茅台').then((r) => r.json()),
      fetch('/stocks/search?q=平安').then((r) => r.json()),
    ])
      .then(([a, b]) => {
        setStocks([...(a as StockItem[]), ...(b as StockItem[])].slice(0, 8));
      })
      .catch(() => {
        setStocks([]);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold mb-1">欢迎回来，{username}</h1>
        <p className="text-sm text-slate-400">以下是您关注的股票行情</p>
      </div>

      {/* 搜索 */}
      <div className="flex gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="搜索股票代码或名称..."
          className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-slate-500"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && search.trim()) {
              window.location.href = `/market?search=${encodeURIComponent(search.trim())}`;
            }
          }}
        />
        <Link
          href={`/market?search=${encodeURIComponent(search)}`}
          className="bg-blue-600 hover:bg-blue-500 text-white rounded-lg px-5 py-2.5 text-sm font-medium flex items-center"
        >
          搜索
        </Link>
      </div>

      {/* 功能卡片 */}
      <div className="grid grid-cols-3 gap-4">
        <Link href="/watchlist" className="bg-slate-800 border border-slate-700 rounded-xl p-4 hover:border-slate-500 transition-colors">
          <div className="text-2xl mb-2">⭐</div>
          <div className="font-medium">自选股</div>
          <div className="text-xs text-slate-400 mt-1">管理关注股票</div>
        </Link>
        <Link href="/membership" className="bg-slate-800 border border-slate-700 rounded-xl p-4 hover:border-slate-500 transition-colors">
          <div className="text-2xl mb-2">👑</div>
          <div className="font-medium">会员中心</div>
          <div className="text-xs text-slate-400 mt-1">解锁AI分析特权</div>
        </Link>
        <Link href="/strategies" className="bg-slate-800 border border-slate-700 rounded-xl p-4 hover:border-slate-500 transition-colors">
          <div className="text-2xl mb-2">📊</div>
          <div className="font-medium">策略广场</div>
          <div className="text-xs text-slate-400 mt-1">浏览他人策略</div>
        </Link>
      </div>

      {/* 股票行情 */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-700 flex items-center justify-between">
          <h2 className="font-semibold text-sm">热门股票</h2>
          <Link href="/market" className="text-xs text-slate-400 hover:text-white">行情 →</Link>
        </div>
        {loading ? (
          <div className="p-6 text-slate-400 text-sm text-center">加载中...</div>
        ) : stocks.length === 0 ? (
          <div className="p-6 text-slate-400 text-sm text-center">暂无数据</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-slate-400 text-xs border-b border-slate-700">
                <th className="text-left px-4 py-2 font-normal">代码</th>
                <th className="text-left px-4 py-2 font-normal">名称</th>
                <th className="text-right px-4 py-2 font-normal">现价</th>
                <th className="text-right px-4 py-2 font-normal">涨跌额</th>
                <th className="text-right px-4 py-2 font-normal">涨跌幅</th>
              </tr>
            </thead>
            <tbody>
              {stocks.map((s) => {
                const up = s.change >= 0;
                return (
                  <tr key={s.code} className="border-b border-slate-800 hover:bg-slate-700/30">
                    <td className="px-4 py-2.5 text-slate-400">{s.code}</td>
                    <td className="px-4 py-2.5 font-medium">{s.name}</td>
                    <td className="px-4 py-2.5 text-right">{Number(s.price).toFixed(2)}</td>
                    <td className={`px-4 py-2.5 text-right ${up ? 'text-red-400' : 'text-green-400'}`}>
                      {up ? '+' : ''}{Number(s.change).toFixed(2)}
                    </td>
                    <td className={`px-4 py-2.5 text-right ${up ? 'text-red-400' : 'text-green-400'}`}>
                      {up ? '+' : ''}{Number(s.changePercent).toFixed(2)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <div className="text-center text-xs text-slate-600">
        市场有风险，投资需谨慎。本平台仅供辅助参考，不构成投资建议。
      </div>
    </div>
  );
}
