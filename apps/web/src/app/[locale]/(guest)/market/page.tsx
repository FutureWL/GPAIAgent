'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { fmtCap, fmtAmount } from '@/lib/stock-utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Icon, icons } from '@/components/ui/icon';
import { cn } from '@/lib/utils';

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
  isIndex?: boolean;
};

const INDEX_CODES = [
  'sh000001', 'sz399001', 'sz399006',
];

const INDEX_NAMES: Record<string, string> = {
  'sh000001': '上证指数',
  'sz399001': '深证成指',
  'sz399006': '创业板指',
};

const STOCK_CODES = [
  'sh600519','sh600036','sh601318','sh600887','sh601888','sh600030','sh601857',
  'sh600276','sh600585','sh600690','sh600809','sh601012','sh600309','sh600048',
  'sh601328','sh601166','sh600000','sh601398','sh601288','sh600016','sh600050',
  'sh601088','sh601668','sh601186','sh601601','sh600028','sh601899','sh600837',
  'sh600999','sh600900','sh600438','sh601225','sh600893','sh601633','sh600760',
  'sh601169','sh600029','sh601991','sh601818','sh600745','sh603799','sh600132',
  'sh600115','sh603259','sh688981','sh688599','sh601985','sh601816','sh600028',
  'sh603288','sh600183','sh600588','sh601166','sh601818',
  'sz000858','sz000333','sz002594','sz000001','sz000002','sz000651','sz000876',
  'sz002415','sz002475','sz002714','sz000568','sz000725','sz000063','sz002230',
  'sz002371','sz002460','sz002466','sz002497','sz002648','sz300750','sz300015',
  'sz300059','sz300122','sz300124','sz300274','sz300760','sz300896','sz300999',
  'sz301536','sz301587','sz000983','sz002352','sz300033','sz300408','sz300782',
  'sz300014','sz300450','sz300012','sz300346','sz300529',
];

function parseTencentLine(raw: string): StockItem | null {
  try {
    const eqIdx = raw.indexOf('=');
    if (eqIdx < 0) return null;
    const parts = raw.substring(eqIdx + 2).split('~');
    if (parts.length < 10) return null;
    const isIndex = !parts[1] || parts[1] === parts[2];
    const code = parts[2] || '';
    const name = isIndex
      ? (parts[40] || parts[1] || code)
      : (parts[1] || code);
    const price = parseFloat(parts[3]) || 0;
    const change = parseFloat(parts[31]) || 0;
    const changePercent = parseFloat(parts[32]) || 0;
    const volume = parseInt(parts[6]) || 0;
    const amount = parseFloat(parts[37]) || 0;
    const turnover = parseFloat(parts[43]) || 0;
    const totalCap = parseFloat(parts[44]) || 0;
    const circulateCap = parseFloat(parts[45]) || 0;
    const netInflow = parseFloat(parts[74]) || 0;
    return {
      code, name: name.replace(/["\s]/g, ''), price, change, changePercent,
      volume, amount, turnover, circulateCap, totalCap, netInflow, isIndex,
    };
  } catch { return null; }
}

async function fetchQuotesBatch(codes: string[]): Promise<StockItem[]> {
  const url = `https://qt.gtimg.cn/q=${codes.join(',')}`;
  const resp = await fetch(url, {
    headers: { Referer: 'https://finance.qq.com', 'User-Agent': 'Mozilla/5.0' },
    signal: AbortSignal.timeout(15000),
  });
  if (!resp.ok) return [];
  const buffer = await resp.arrayBuffer();
  const text = new TextDecoder('gbk').decode(Buffer.from(buffer));
  const lines = text.trim().split('\n');
  return lines.map(parseTencentLine).filter(Boolean) as StockItem[];
}

function StockRow({ s, locale }: { s: StockItem; locale: string }) {
  const up = s.change >= 0;
  return (
    <tr
      className="border-b border-border hover:bg-accent/50 cursor-pointer transition-colors"
      onClick={() => window.location.href = `/${locale}/stock/${s.code}`}
    >
      <td className="px-3 py-2.5 text-xs text-muted-foreground font-mono">{s.code}</td>
      <td className="px-3 py-2.5 text-sm font-medium">{s.name}</td>
      <td className="px-3 py-2.5 text-right font-mono text-sm font-medium tabular-nums">
        {s.price > 0 ? s.price.toFixed(2) : '-'}
      </td>
      <td className={`px-3 py-2.5 text-right font-mono text-sm tabular-nums ${up ? 'text-stock-up' : 'text-stock-down'}`}>
        {up ? '+' : ''}{s.change.toFixed(2)}
      </td>
      <td className="px-3 py-2.5 text-right">
        <span className={`inline-flex items-center gap-0.5 text-xs font-mono tabular-nums px-1.5 py-0.5 rounded ${up ? 'bg-stock-up text-stock-up' : 'bg-stock-down text-stock-down'}`}>
          {up ? '▲' : '▼'} {Math.abs(s.changePercent).toFixed(2)}%
        </span>
      </td>
      <td className="px-3 py-2.5 text-right text-xs text-muted-foreground font-mono tabular-nums hidden md:table-cell">
        {s.amount ? fmtAmount(s.amount) : '-'}
      </td>
      <td className="px-3 py-2.5 text-right text-xs text-muted-foreground font-mono tabular-nums hidden lg:table-cell">
        {s.turnover ? `${s.turnover.toFixed(2)}%` : '-'}
      </td>
      <td className="px-3 py-2.5 text-right text-xs text-muted-foreground font-mono tabular-nums hidden xl:table-cell">
        {s.circulateCap ? fmtCap(s.circulateCap) : '-'}
      </td>
    </tr>
  );
}

function IndexCard({ s }: { s: StockItem }) {
  const up = s.change >= 0;
  return (
    <Card className="flex-1 min-w-[160px] hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="text-xs text-muted-foreground mb-1">{s.name}</div>
        <div className={`text-2xl font-bold font-mono tabular-nums ${up ? 'text-stock-up' : 'text-stock-down'}`}>
          {s.price > 0 ? s.price.toFixed(2) : '-'}
        </div>
        <div className={`text-sm font-mono tabular-nums mt-1 ${up ? 'text-stock-up' : 'text-stock-down'}`}>
          {up ? '+' : ''}{s.change.toFixed(2)} &nbsp; {up ? '+' : ''}{Math.abs(s.changePercent).toFixed(2)}%
        </div>
      </CardContent>
    </Card>
  );
}

export default function MarketPage() {
  const router = useRouter();
  const pathname = usePathname();
  const locale = pathname.split('/')[1] || 'zh';
  const [allStocks, setAllStocks] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [displayedStocks, setDisplayedStocks] = useState<StockItem[]>([]);

  const fetchMarket = useCallback(async () => {
    setLoading(true);
    try {
      const BATCH = 50;
      const allCodes = [...INDEX_CODES, ...STOCK_CODES];
      const batches: string[][] = [];
      for (let i = 0; i < allCodes.length; i += BATCH) {
        batches.push(allCodes.slice(i, i + BATCH));
      }
      const results = await Promise.all(batches.map(fetchQuotesBatch));
      const merged = results.flat();
      merged.sort((a, b) => (b.volume || 0) - (a.volume || 0));
      const seen = new Set<string>();
      const unique = merged.filter(s => {
        if (seen.has(s.code)) return false;
        seen.add(s.code);
        return true;
      });
      setAllStocks(unique);
    } catch {
      setAllStocks([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchMarket(); }, [fetchMarket]);

  useEffect(() => {
    if (!search.trim()) {
      setDisplayedStocks(allStocks.filter(s => !s.isIndex).slice(0, 100));
    } else {
      const q = search.toUpperCase();
      setDisplayedStocks(
        allStocks.filter((s) => s.code.includes(q) || s.name.includes(search)).slice(0, 100)
      );
    }
  }, [search, allStocks]);

  const indexStocks = allStocks.filter(s => s.isIndex);
  const isZh = locale === 'zh';

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">

      {/* Hero header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">
          {isZh ? '行情中心' : 'Market Center'}
        </h1>
        <p className="text-sm text-muted-foreground">
          {isZh ? 'A股市场实时行情' : 'Real-time A-Share Market Data'} &nbsp;·&nbsp;
          {allStocks.filter(s => !s.isIndex).length > 0 && (
            <span>{allStocks.filter(s => !s.isIndex).length} {isZh ? '只股票' : 'stocks'}</span>
          )}
        </p>
      </div>

      {/* Index cards */}
      {indexStocks.length > 0 && (
        <div className="flex gap-3 overflow-x-auto pb-1">
          {indexStocks.map(s => <IndexCard key={s.code} s={s} />)}
        </div>
      )}

      {/* Search + actions */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Icon name={icons.Search} className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={isZh ? '搜索股票代码或名称...' : 'Search code or name...'}
            className="pl-9"
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchMarket}
          disabled={loading}
          className="gap-1.5"
        >
          <Icon name={icons.RefreshCw} className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
          {isZh ? '刷新' : 'Refresh'}
        </Button>
      </div>

      {/* Market table */}
      <Card>
        <CardHeader className="pb-0 px-4 pt-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">
              {isZh ? '全部股票' : 'All Stocks'}
            </CardTitle>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              {loading ? (isZh ? '加载中...' : 'Loading...') : `${displayedStocks.length} ${isZh ? '只' : ''}`}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-muted-foreground border-b border-border">
                  <th className="text-left px-3 py-2.5 font-normal">{isZh ? '代码' : 'Code'}</th>
                  <th className="text-left px-3 py-2.5 font-normal">{isZh ? '名称' : 'Name'}</th>
                  <th className="text-right px-3 py-2.5 font-normal">{isZh ? '现价' : 'Price'}</th>
                  <th className="text-right px-3 py-2.5 font-normal">{isZh ? '涨跌' : 'Change'}</th>
                  <th className="text-right px-3 py-2.5 font-normal">{isZh ? '涨跌幅' : '%'}</th>
                  <th className="text-right px-3 py-2.5 font-normal hidden md:table-cell">{isZh ? '成交额' : 'Turnover'}</th>
                  <th className="text-right px-3 py-2.5 font-normal hidden lg:table-cell">{isZh ? '换手率' : 'Rate'}</th>
                  <th className="text-right px-3 py-2.5 font-normal hidden xl:table-cell">{isZh ? '流通市值' : 'MCap'}</th>
                </tr>
              </thead>
              <tbody>
                {loading && displayedStocks.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-16 text-muted-foreground">
                      {isZh ? '正在获取行情数据...' : 'Fetching market data...'}
                    </td>
                  </tr>
                ) : displayedStocks.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-16 text-muted-foreground">
                      {isZh ? '暂无数据' : 'No data'}
                    </td>
                  </tr>
                ) : (
                  displayedStocks.map(s => <StockRow key={s.code} s={s} locale={locale} />)
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
