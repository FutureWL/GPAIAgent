'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';

type StockItem = {
  code: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume?: number;
};

export default function HomePage() {
  const [stocks, setStocks] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    // 默认展示热门股票（接入 API 真实数据）
    Promise.all([
      apiFetch<StockItem[]>('/stocks/search?q=茅台'),
      apiFetch<StockItem[]>('/stocks/search?q=平安'),
    ])
      .then(([a, b]) => {
        const merged = [...a, ...b].slice(0, 8);
        setStocks(merged);
      })
      .catch(() => {
        // fallback mock
        setStocks([
          { code: '600519', name: '贵州茅台', price: 1688.00, change: 20.50, changePercent: 1.23 },
          { code: '000858', name: '五粮液', price: 142.30, change: -1.80, changePercent: -1.25 },
          { code: '601318', name: '中国平安', price: 45.60, change: 0.85, changePercent: 1.90 },
          { code: '000001', name: '平安银行', price: 11.25, change: 0.15, changePercent: 1.35 },
        ]);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-5">
      {/* 欢迎 + 快捷操作 */}
      <div>
        <h1 className="text-2xl font-bold mb-1">欢迎回来</h1>
        <p className="text-sm text-slate-400">以下是您关注的股票行情</p>
      </div>

      {/* 快速搜索 */}
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

      {/* 关注股票行情 */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-700 flex items-center justify-between">
          <h2 className="font-semibold text-sm">我的自选</h2>
          <Link href="/watchlist" className="text-xs text-slate-400 hover:text-white">管理 →</Link>
        </div>
        {loading ? (
          <div className="p-6 text-slate-400 text-sm text-center">加载中...</div>
        ) : stocks.length === 0 ? (
          <div className="p-6 text-slate-400 text-sm text-center">
            暂无自选股，<Link href="/watchlist" className="text-blue-400 hover:underline">去添加</Link>
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
              </tr>
            </thead>
            <tbody>
              {stocks.map((s) => {
                const up = s.change >= 0;
                return (
                  <tr key={s.code} className="border-b border-slate-800 hover:bg-slate-700/30">
                    <td className="px-4 py-2.5 text-slate-400">{s.code}</td>
                    <td className="px-4 py-2.5 font-medium">{s.name}</td>
                    <td className="px-4 py-2.5 text-right">{s.price.toFixed(2)}</td>
                    <td className={`px-4 py-2.5 text-right ${up ? 'text-red-400' : 'text-green-400'}`}>
                      {up ? '+' : ''}{s.change.toFixed(2)}
                    </td>
                    <td className={`px-4 py-2.5 text-right ${up ? 'text-red-400' : 'text-green-400'}`}>
                      {up ? '+' : ''}{s.changePercent.toFixed(2)}%
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
