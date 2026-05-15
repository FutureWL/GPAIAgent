'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { apiFetch } from '../lib/api';

type StockItem = {
  code: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
};

type Me = { id: string; username: string; name: string | null; avatar: string | null };

export default function HomePage() {
  const [me, setMe] = useState<Me | null>(null);
  const [hotStocks, setHotStocks] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    apiFetch<Me>('/auth/me')
      .then((data) => { if (!cancelled) setMe(data); })
      .catch(() => { if (!cancelled) setMe(null); });

    // 默认热门股票
    const defaultStocks: StockItem[] = [
      { code: '600519', name: '贵州茅台', price: 1688.00, change: 20.50, changePercent: 1.23 },
      { code: '000858', name: '五粮液', price: 142.30, change: -1.80, changePercent: -1.25 },
      { code: '601318', name: '中国平安', price: 45.60, change: 0.85, changePercent: 1.90 },
      { code: '000001', name: '平安银行', price: 11.25, change: 0.15, changePercent: 1.35 },
    ];
    if (!cancelled) setHotStocks(defaultStocks);
    setLoading(false);
    return () => { cancelled = true; };
  }, []);

  async function logout() {
    await apiFetch('/auth/logout', { method: 'POST' });
    setMe(null);
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 text-white">
      {/* 顶部导航 */}
      <header className="border-b border-slate-700">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <span className="text-xl font-bold text-white">GPAIAgent</span>
            <nav className="flex gap-4 text-sm text-slate-300">
              <Link href="/" className="text-white font-medium">首页</Link>
              <Link href="/watchlist">自选</Link>
              <Link href="/membership">会员</Link>
              <Link href="/strategies">策略广场</Link>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            {me ? (
              <>
                <span className="text-sm text-slate-300">{me.username}</span>
                <button onClick={logout} className="text-sm text-slate-300 hover:text-white">退出</button>
              </>
            ) : (
              <>
                <Link href="/login" className="text-sm text-slate-300 hover:text-white">登录</Link>
                <Link href="/register" className="text-sm bg-white text-slate-900 rounded px-3 py-1 font-medium">注册</Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* 主体内容 */}
      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* 行情状态栏 */}
        <div className="mb-6 flex items-center gap-3 text-sm">
          <span className="text-green-400">●</span>
          <span className="text-slate-300">实时行情 · 数据仅供参考</span>
        </div>

        {/* 功能入口卡片 */}
        <div className="grid grid-cols-4 gap-4 mb-8">
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
          <Link href="/strategies/new" className="bg-slate-800 border border-slate-700 rounded-xl p-4 hover:border-slate-500 transition-colors">
            <div className="text-2xl mb-2">✍️</div>
            <div className="font-medium">发布策略</div>
            <div className="text-xs text-slate-400 mt-1">分享您的观点</div>
          </Link>
        </div>

        {/* 热门股票 */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-700 flex items-center justify-between">
            <h2 className="font-semibold">热门股票</h2>
            <Link href="/watchlist" className="text-xs text-slate-400 hover:text-white">查看全部 →</Link>
          </div>
          {loading ? (
            <div className="p-6 text-slate-400 text-sm">加载中...</div>
          ) : hotStocks.length === 0 ? (
            <div className="p-6 text-slate-400 text-sm">暂无数据</div>
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
                {hotStocks.map((s) => {
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

        <div className="mt-6 text-center text-xs text-slate-500">
          市场有风险，投资需谨慎。本平台仅供辅助参考，不构成投资建议。
        </div>
      </div>
    </main>
  );
}
