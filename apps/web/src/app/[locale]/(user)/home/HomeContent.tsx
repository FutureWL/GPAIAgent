'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Star, Crown, TrendingUp, Newspaper, Zap, ArrowRight } from 'lucide-react';
import { Icon, icons } from '@/components/ui/icon';

type StockItem = {
  code: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
};

type HomeContentProps = {
  username: string;
  locale?: string;
};

export default function HomeContent({ username, locale = 'zh' }: HomeContentProps) {
  const router = useRouter();
  const [stocks, setStocks] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const localePrefix = `/${locale}`;

  useEffect(() => {
    Promise.all([
      fetch('/stocks/search?q=茅台').then((r) => r.json()),
      fetch('/stocks/search?q=平安').then((r) => r.json()),
    ])
      .then(([a, b]) => {
        setStocks([...(a as StockItem[]), ...(b as StockItem[])].slice(0, 8));
      })
      .catch(() => setStocks([]))
      .finally(() => setLoading(false));
  }, []);

  const handleSearch = () => {
    if (search.trim()) {
      router.push(`${localePrefix}/market?search=${encodeURIComponent(search.trim())}`);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">

      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 rounded-2xl p-8 text-white relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <Icon name={icons.Zap} className="w-5 h-5 text-yellow-300" />
            <span className="text-sm text-blue-200">GPAI 智能炒股助手</span>
          </div>
          <h1 className="text-3xl font-bold mb-2">
            {locale === 'zh' ? `欢迎回来，${username}` : `Welcome back, ${username}`}
          </h1>
          <p className="text-blue-200 text-sm">
            {locale === 'zh'
              ? 'AI 驱动的短线策略分析，助您把握每一个交易机会'
              : 'AI-powered short-term trading strategies to help you seize every opportunity'}
          </p>
        </div>
        {/* Decorative circles */}
        <div className="absolute -right-8 -top-8 w-40 h-40 bg-blue-600/20 rounded-full" />
        <div className="absolute -right-4 bottom-0 w-24 h-24 bg-indigo-600/20 rounded-full" />
      </div>

      {/* Quick Access Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Link
          href={`${localePrefix}/watchlist`}
          className="group bg-card border border-border rounded-xl p-5 hover:border-primary/50 hover:shadow-lg transition-all"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center">
              <Icon name={icons.Star} className="w-5 h-5 text-yellow-500" />
            </div>
            <Icon name={icons.ArrowRight} className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
          <div className="font-semibold mb-1">{locale === 'zh' ? '我的自选' : 'My Watchlist'}</div>
          <div className="text-xs text-muted-foreground">{locale === 'zh' ? '关注股票实时行情' : 'Track stocks in real-time'}</div>
        </Link>

        <Link
          href={`${localePrefix}/membership`}
          className="group bg-card border border-border rounded-xl p-5 hover:border-primary/50 hover:shadow-lg transition-all"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <Icon name={icons.Crown} className="w-5 h-5 text-purple-500" />
            </div>
            <Icon name={icons.ArrowRight} className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
          <div className="font-semibold mb-1">{locale === 'zh' ? '会员中心' : 'Membership'}</div>
          <div className="text-xs text-muted-foreground">{locale === 'zh' ? '解锁 AI 分析特权' : 'Unlock AI analysis features'}</div>
        </Link>

        <Link
          href={`${localePrefix}/strategies`}
          className="group bg-card border border-border rounded-xl p-5 hover:border-primary/50 hover:shadow-lg transition-all"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
              <Icon name={icons.ChartBarBig} className="w-5 h-5 text-green-500" />
            </div>
            <Icon name={icons.ArrowRight} className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
          <div className="font-semibold mb-1">{locale === 'zh' ? '策略广场' : 'Strategy Hub'}</div>
          <div className="text-xs text-muted-foreground">{locale === 'zh' ? '浏览 & 分享交易策略' : 'Browse & share trading strategies'}</div>
        </Link>
      </div>

      {/* Main Content: Market + News */}
      <div className="grid grid-cols-3 gap-6">
        {/* Stock Market Table */}
        <div className="col-span-2 bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Icon name={icons.TrendingUp} className="w-4 h-4 text-primary" />
              <h2 className="font-semibold text-sm">{locale === 'zh' ? '热门股票' : 'Hot Stocks'}</h2>
            </div>
            <Link href={`${localePrefix}/market`} className="text-xs text-primary hover:underline">
              {locale === 'zh' ? '查看更多 →' : 'More →'}
            </Link>
          </div>

          {/* Search bar inside */}
          <div className="px-5 py-3 border-b border-border">
            <div className="flex gap-2">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={locale === 'zh' ? '搜索股票代码或名称...' : 'Search stock code or name...'}
                className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-primary/50"
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
              <button
                onClick={handleSearch}
                className="bg-primary text-primary-foreground rounded-lg px-4 py-2 text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                {locale === 'zh' ? '搜索' : 'Search'}
              </button>
            </div>
          </div>

          {loading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">{locale === 'zh' ? '加载中...' : 'Loading...'}</div>
          ) : stocks.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">{locale === 'zh' ? '暂无数据' : 'No data'}</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-muted-foreground border-b border-border">
                  <th className="text-left px-5 py-2.5 font-normal">{locale === 'zh' ? '代码' : 'Code'}</th>
                  <th className="text-left px-2 py-2.5 font-normal">{locale === 'zh' ? '名称' : 'Name'}</th>
                  <th className="text-right px-3 py-2.5 font-normal">{locale === 'zh' ? '现价' : 'Price'}</th>
                  <th className="text-right px-3 py-2.5 font-normal">{locale === 'zh' ? '涨跌额' : 'Change'}</th>
                  <th className="text-right px-5 py-2.5 font-normal">{locale === 'zh' ? '涨跌幅' : '%'}</th>
                </tr>
              </thead>
              <tbody>
                {stocks.map((s) => {
                  const up = s.change >= 0;
                  return (
                    <tr key={s.code} className="border-b border-border/50 hover:bg-accent/30 transition-colors cursor-pointer"
                      onClick={() => router.push(`${localePrefix}/market?search=${s.code}`)}>
                      <td className="px-5 py-2.5 text-muted-foreground font-mono text-xs">{s.code}</td>
                      <td className="px-2 py-2.5 font-medium text-sm">{s.name}</td>
                      <td className="px-3 py-2.5 text-right font-mono">{Number(s.price).toFixed(2)}</td>
                      <td className={`px-3 py-2.5 text-right font-mono ${up ? 'text-red-400' : 'text-green-400'}`}>
                        {up ? '+' : ''}{Number(s.change).toFixed(2)}
                      </td>
                      <td className={`px-5 py-2.5 text-right font-mono ${up ? 'text-red-400' : 'text-green-400'}`}>
                        {up ? '+' : ''}{Number(s.changePercent).toFixed(2)}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* News / Announcements */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center gap-2">
            <Icon name={icons.Newspaper} className="w-4 h-4 text-primary" />
            <h2 className="font-semibold text-sm">{locale === 'zh' ? '最新资讯' : 'Latest News'}</h2>
          </div>
          <div className="p-4 space-y-3">
            {[
              { title: locale === 'zh' ? 'A股三大指数集体收涨，沪指重回3300点' : 'A-shares close higher, Shanghai Composite back above 3300', time: locale === 'zh' ? '10分钟前' : '10 min ago', tag: locale === 'zh' ? '市场' : 'Market' },
              { title: locale === 'zh' ? 'AI策略信号：贵州茅台出现买入窗口' : 'AI Signal: Kweichow Moutai shows buy signal', time: locale === 'zh' ? '35分钟前' : '35 min ago', tag: locale === 'zh' ? 'AI信号' : 'AI Signal' },
              { title: locale === 'zh' ? '新手入门：如何使用AI策略辅助短线交易' : 'Guide: How to use AI strategies for short-term trading', time: locale === 'zh' ? '2小时前' : '2 hrs ago', tag: locale === 'zh' ? '教程' : 'Tutorial' },
            ].map((item, i) => (
              <Link href={`${localePrefix}/blog`} key={i} className="block group">
                <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-accent/50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-medium bg-primary/10 text-primary px-1.5 py-0.5 rounded">{item.tag}</span>
                      <span className="text-[10px] text-muted-foreground">{item.time}</span>
                    </div>
                    <div className="text-sm leading-snug group-hover:text-primary transition-colors line-clamp-2">{item.title}</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
          <Link href={`${localePrefix}/blog`} className="block px-5 py-3 border-t border-border text-xs text-primary hover:underline text-center">
            {locale === 'zh' ? '查看全部资讯 →' : 'View all →'}
          </Link>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="text-center text-xs text-muted-foreground/50 py-2">
        {locale === 'zh'
          ? '市场有风险，投资需谨慎。本平台仅供辅助参考，不构成任何投资建议。'
          : 'Markets carry risk. Invest responsibly. This platform is for reference only, not financial advice.'}
      </div>
    </div>
  );
}
