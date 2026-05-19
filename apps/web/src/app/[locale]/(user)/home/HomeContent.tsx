'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Icon, icons } from '@/components/ui/icon';

// ============ types ============
type StockItem = {
  code: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
};

type IndexItem = {
  code: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
};

type Article = {
  id: string;
  title: string;
  excerpt?: string;
  type: string;
  createdAt: string;
};

type AiSignal = {
  id: string;
  stockCode: string;
  stockName: string;
  type: 'BUY' | 'SELL' | 'HOLD';
  reason: string;
  price: number;
  createdAt: string;
};

// ============ 工具函数 ============
function timeAgo(dateStr: string, locale = 'zh'): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (locale === 'zh') {
    if (mins < 1) return '刚刚';
    if (mins < 60) return `${mins}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    return `${days}天前`;
  }
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  if (hours < 24) return `${hours} hr ago`;
  return `${days} days ago`;
}

function getTagLabel(type: string, locale: string = 'zh'): string {
  const map: Record<string, { zh: string; en: string }> = {
    article: { zh: '市场', en: 'Market' },
    video: { zh: '视频', en: 'Video' },
    tutorial: { zh: '教程', en: 'Tutorial' },
    ai: { zh: 'AI信号', en: 'AI Signal' },
    news: { zh: '资讯', en: 'News' },
  };
  const entry = map[type];
  return (entry?.[locale as 'zh' | 'en'] ?? (locale === 'zh' ? '资讯' : 'News'));
}

// ============ 组件 ============
export default function HomeContent({ username, locale = 'zh' }: { username: string; locale?: string }) {
  const router = useRouter();
  const localePrefix = `/${locale}`;

  const [hotStocks, setHotStocks] = useState<StockItem[]>([]);
  const [indices, setIndices] = useState<IndexItem[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [aiSignals, setAiSignals] = useState<AiSignal[]>([]);
  const [hotLoading, setHotLoading] = useState(true);
  const [articlesLoading, setArticlesLoading] = useState(true);
  const [search, setSearch] = useState('');

  // 并行加载所有数据
  useEffect(() => {
    Promise.all([
      // 热门股票
      fetch('/api/stocks/hot?limit=8').then(r => r.json()).catch(() => []),
      // 大盘指数
      fetch('/api/stocks/quotes?codes=sh000001,sz399001,sz399006').then(r => r.json()).catch(() => []),
      // 资讯
      fetch('/api/posts?type=article&pageSize=3').then(r => r.json()).then(d => d.posts ?? []).catch(() => []),
      // AI信号
      fetch('/api/ai-signals/today?limit=3').then(r => r.json()).catch(() => []),
    ]).then(([stocks, idx, arts, signals]) => {
      setHotStocks(Array.isArray(stocks) ? stocks : []);
      setIndices(Array.isArray(idx) ? idx : []);
      setArticles(Array.isArray(arts) ? arts : (arts.posts ?? []));
      setAiSignals(Array.isArray(signals) ? signals : []);
    }).finally(() => {
      setHotLoading(false);
      setArticlesLoading(false);
    });
  }, []);

  const handleSearch = () => {
    if (search.trim()) {
      router.push(`${localePrefix}/market?search=${encodeURIComponent(search.trim())}`);
    }
  };

  // 统一涨跌颜色
  const upColor = 'text-red-400';
  const downColor = 'text-green-400';
  const fmt = (n: number, decimals = 2) => (n >= 0 ? '+' : '') + n.toFixed(decimals);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">

      {/* ========== 欢迎 Banner ========== */}
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
        <div className="absolute -right-8 -top-8 w-40 h-40 bg-blue-600/20 rounded-full" />
        <div className="absolute -right-4 bottom-0 w-24 h-24 bg-indigo-600/20 rounded-full" />
      </div>

      {/* ========== 大盘指数横滚条 ========== */}
      {indices.length > 0 && (
        <div className="flex gap-4 overflow-x-auto pb-1">
          {indices.map((idx) => {
            const up = idx.change >= 0;
            return (
              <div key={idx.code} className="flex-shrink-0 bg-card border border-border rounded-xl px-5 py-3 min-w-[170px]">
                <div className="text-xs text-muted-foreground mb-0.5">{idx.name}</div>
                <div className="text-lg font-mono font-bold leading-tight">{idx.price.toFixed(2)}</div>
                <div className={`text-sm font-mono ${up ? upColor : downColor}`}>
                  {fmt(idx.change)} ({fmt(idx.changePercent)}%)
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========== 快捷入口 ========== */}
      <div className="grid grid-cols-3 gap-4">
        <Link href={`${localePrefix}/watchlist`} className="group bg-card border border-border rounded-xl p-5 hover:border-primary/50 hover:shadow-lg transition-all">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center">
              <Icon name={icons.Star} className="w-5 h-5 text-yellow-500" />
            </div>
            <Icon name={icons.ArrowRight} className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
          <div className="font-semibold mb-1">{locale === 'zh' ? '我的自选' : 'My Watchlist'}</div>
          <div className="text-xs text-muted-foreground">{locale === 'zh' ? '关注股票实时行情' : 'Track stocks in real-time'}</div>
        </Link>

        <Link href={`${localePrefix}/membership`} className="group bg-card border border-border rounded-xl p-5 hover:border-primary/50 hover:shadow-lg transition-all">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <Icon name={icons.Crown} className="w-5 h-5 text-purple-500" />
            </div>
            <Icon name={icons.ArrowRight} className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
          <div className="font-semibold mb-1">{locale === 'zh' ? '会员中心' : 'Membership'}</div>
          <div className="text-xs text-muted-foreground">{locale === 'zh' ? '解锁 AI 分析特权' : 'Unlock AI analysis features'}</div>
        </Link>

        <Link href={`${localePrefix}/strategies`} className="group bg-card border border-border rounded-xl p-5 hover:border-primary/50 hover:shadow-lg transition-all">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
              <Icon name={icons.BarChart3} className="w-5 h-5 text-green-500" />
            </div>
            <Icon name={icons.ArrowRight} className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
          <div className="font-semibold mb-1">{locale === 'zh' ? '策略广场' : 'Strategy Hub'}</div>
          <div className="text-xs text-muted-foreground">{locale === 'zh' ? '浏览 & 分享交易策略' : 'Browse & share trading strategies'}</div>
        </Link>
      </div>

      {/* ========== AI 今日信号 ========== */}
      {aiSignals.length > 0 && (
        <div className="bg-gradient-to-r from-amber-900/20 to-orange-900/20 border border-amber-500/20 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Icon name={icons.Zap} className="w-4 h-4 text-amber-400" />
            <h2 className="font-semibold text-sm">{locale === 'zh' ? 'AI 今日信号' : 'AI Today\'s Signals'}</h2>
          </div>
          <div className="space-y-2">
            {aiSignals.map((signal) => {
              const typeStyles = {
                BUY: 'bg-red-500/10 text-red-400 border border-red-500/20',
                SELL: 'bg-green-500/10 text-green-400 border border-green-500/20',
                HOLD: 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20',
              };
              const typeLabels = { BUY: locale === 'zh' ? '买入' : 'BUY', SELL: locale === 'zh' ? '卖出' : 'SELL', HOLD: locale === 'zh' ? '持有' : 'HOLD' };
              return (
                <div key={signal.id} className="flex items-center gap-3 p-3 bg-card/60 rounded-lg">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded flex-shrink-0 ${typeStyles[signal.type]}`}>
                    {typeLabels[signal.type]}
                  </span>
                  <span className="text-sm font-medium">{signal.stockName}</span>
                  <span className="text-xs text-muted-foreground flex-1 truncate">{signal.reason}</span>
                  <span className="text-xs text-muted-foreground flex-shrink-0">{signal.price.toFixed(2)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========== 主内容区：热门股票 + 最新资讯 ========== */}
      <div className="grid grid-cols-3 gap-6">
        {/* 热门股票 */}
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

          {/* 搜索框 */}
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

          {hotLoading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">{locale === 'zh' ? '加载中...' : 'Loading...'}</div>
          ) : hotStocks.length === 0 ? (
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
                {hotStocks.map((s) => {
                  const up = s.change >= 0;
                  return (
                    <tr
                      key={s.code}
                      className="border-b border-border/50 hover:bg-accent/30 transition-colors cursor-pointer"
                      onClick={() => router.push(`${localePrefix}/market?search=${s.code}`)}
                    >
                      <td className="px-5 py-2.5 text-muted-foreground font-mono text-xs">{s.code}</td>
                      <td className="px-2 py-2.5 font-medium text-sm">{s.name}</td>
                      <td className="px-3 py-2.5 text-right font-mono">{s.price > 0 ? s.price.toFixed(2) : '-'}</td>
                      <td className={`px-3 py-2.5 text-right font-mono ${up ? upColor : downColor}`}>
                        {s.price > 0 ? fmt(s.change) : '-'}
                      </td>
                      <td className={`px-5 py-2.5 text-right font-mono ${up ? upColor : downColor}`}>
                        {s.price > 0 ? `${fmt(s.changePercent)}%` : '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* 最新资讯 */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center gap-2">
            <Icon name={icons.Newspaper} className="w-4 h-4 text-primary" />
            <h2 className="font-semibold text-sm">{locale === 'zh' ? '最新资讯' : 'Latest News'}</h2>
          </div>
          <div className="p-4 space-y-3">
            {articlesLoading ? (
              <div className="text-center text-sm text-muted-foreground py-4">{locale === 'zh' ? '加载中...' : 'Loading...'}</div>
            ) : articles.length === 0 ? (
              <div className="text-center text-sm text-muted-foreground py-4">{locale === 'zh' ? '暂无资讯' : 'No news'}</div>
            ) : (
              articles.map((article) => (
                <Link href={`${localePrefix}/blog/${article.id}`} key={article.id} className="block group">
                  <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-accent/50 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-medium bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                          {getTagLabel(article.type, locale)}
                        </span>
                        <span className="text-[10px] text-muted-foreground">{timeAgo(article.createdAt, locale)}</span>
                      </div>
                      <div className="text-sm leading-snug group-hover:text-primary transition-colors line-clamp-2">{article.title}</div>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
          <Link href={`${localePrefix}/blog`} className="block px-5 py-3 border-t border-border text-xs text-primary hover:underline text-center">
            {locale === 'zh' ? '查看全部资讯 →' : 'View all →'}
          </Link>
        </div>
      </div>

      {/* 风险提示 */}
      <div className="text-center text-xs text-muted-foreground/50 py-2">
        {locale === 'zh'
          ? '市场有风险，投资需谨慎。本平台仅供辅助参考，不构成任何投资建议。'
          : 'Markets carry risk. Invest responsibly. This platform is for reference only, not financial advice.'}
      </div>
    </div>
  );
}
