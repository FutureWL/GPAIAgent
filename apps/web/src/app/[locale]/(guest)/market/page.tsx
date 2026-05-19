'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
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

const INDEX_CODES = ['sh000001', 'sz399001', 'sz399006'];

const STOCK_CODES = [
  'sh600519','sh600036','sh601318','sh600887','sh601888','sh600030','sh601857',
  'sh600276','sh600585','sh600690','sh600809','sh601012','sh600309','sh600048',
  'sh601328','sh601166','sh600000','sh601398','sh601288','sh600016','sh600050',
  'sh601088','sh601668','sh601186','sh601601','sh600028','sh601899','sh600837',
  'sh600999','sh600900','sh600438','sh601225','sh600893','sh601633','sh600760',
  'sh601169','sh600029','sh601991','sh601818','sh600745','sh603799','sh600132',
  'sh600115','sh603259','sh688981','sh688599','sh601985','sh601816',
  'sh603288','sh600183','sh600588','sz000858','sz000333','sz002594',
  'sz000001','sz000002','sz000651','sz000876','sz002415','sz002475',
  'sz002714','sz000568','sz000725','sz000063','sz002230','sz002371',
  'sz002460','sz002466','sz002497','sz002648','sz300750','sz300015',
  'sz300059','sz300122','sz300124','sz300274','sz300760','sz300896',
  'sz300999','sz301536','sz301587','sz000983','sz002352','sz300033',
  'sz300408','sz300782','sz300014','sz300450','sz300012','sz300346',
  'sz300529',
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
      onClick={() => { window.location.href = `/${locale}/stock/${s.code}`; }}
    >
      <td className="px-3 py-2.5 text-xs text-muted-foreground font-mono">{s.code}</td>
      <td className="px-3 py-2.5 text-sm font-medium">{s.name}</td>
      <td className="px-3 py-2.5 text-right font-mono text-sm font-medium tabular-nums">
        {s.price > 0 ? s.price.toFixed(2) : '-'}
      </td>
      <td className={cn('px-3 py-2.5 text-right font-mono text-sm tabular-nums', up ? 'text-stock-up' : 'text-stock-down')}>
        {up ? '+' : ''}{s.change.toFixed(2)}
      </td>
      <td className="px-3 py-2.5 text-right">
        <span className={cn(
          'inline-flex items-center gap-0.5 text-xs font-mono tabular-nums px-1.5 py-0.5 rounded',
          up ? 'bg-stock-up text-stock-up' : 'bg-stock-down text-stock-down'
        )}>
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
        <div className={cn('text-2xl font-bold font-mono tabular-nums', up ? 'text-stock-up' : 'text-stock-down')}>
          {s.price > 0 ? s.price.toFixed(2) : '-'}
        </div>
        <div className={cn('text-sm font-mono tabular-nums mt-1', up ? 'text-stock-up' : 'text-stock-down')}>
          {up ? '+' : ''}{s.change.toFixed(2)} &nbsp; {up ? '+' : ''}{Math.abs(s.changePercent).toFixed(2)}%
        </div>
      </CardContent>
    </Card>
  );
}

function PaginationControls({
  currentPage, totalPages, onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;

  const pages: (number | '...')[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (currentPage > 3) pages.push('...');
    for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
      pages.push(i);
    }
    if (currentPage < totalPages - 2) pages.push('...');
    pages.push(totalPages);
  }

  return (
    <div className="flex items-center gap-1 mt-4 px-4 pb-4">
      <div className="flex items-center gap-1 ml-auto">
        {/* First */}
        <Button
          variant="ghost" size="icon" className="h-7 w-7"
          onClick={() => onPageChange(1)} disabled={currentPage === 1}
        >
          <span className="text-xs font-bold">«</span>
        </Button>
        {/* Prev */}
        <Button
          variant="ghost" size="icon" className="h-7 w-7"
          onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1}
        >
          <span className="text-xs font-bold">‹</span>
        </Button>

        {pages.map((p, i) =>
          p === '...' ? (
            <span key={`ellipsis-${i}`} className="px-1 text-muted-foreground text-xs">…</span>
          ) : (
            <Button
              key={p}
              variant={p === currentPage ? 'default' : 'ghost'}
              size="icon" className="h-7 w-7 text-xs"
              onClick={() => onPageChange(p as number)}
            >
              {p}
            </Button>
          )
        )}

        {/* Next */}
        <Button
          variant="ghost" size="icon" className="h-7 w-7"
          onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages}
        >
          <span className="text-xs font-bold">›</span>
        </Button>
        {/* Last */}
        <Button
          variant="ghost" size="icon" className="h-7 w-7"
          onClick={() => onPageChange(totalPages)} disabled={currentPage === totalPages}
        >
          <span className="text-xs font-bold">»</span>
        </Button>
      </div>
    </div>
  );
}

const PAGE_SIZE_OPTIONS = [20, 50, 100];

export default function MarketPage() {
  const pathname = usePathname();
  const locale = pathname.split('/')[1] || 'zh';
  const [allStocks, setAllStocks] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

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

  // Reset to page 1 when search or pageSize changes
  useEffect(() => { setCurrentPage(1); }, [search, pageSize]);

  // Derived data
  const nonIndexStocks = useMemo(() => allStocks.filter(s => !s.isIndex), [allStocks]);
  const filteredStocks = useMemo(() => {
    if (!search.trim()) return nonIndexStocks;
    const q = search.trim().toUpperCase();
    return nonIndexStocks.filter(s => s.code.includes(q) || s.name.includes(search.trim()));
  }, [nonIndexStocks, search]);

  const totalPages = Math.max(1, Math.ceil(filteredStocks.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const displayedStocks = useMemo(
    () => filteredStocks.slice((safePage - 1) * pageSize, safePage * pageSize),
    [filteredStocks, safePage, pageSize]
  );

  const indexStocks = useMemo(() => allStocks.filter(s => s.isIndex), [allStocks]);
  const isZh = locale === 'zh';

  const startItem = filteredStocks.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const endItem = Math.min(safePage * pageSize, filteredStocks.length);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-4">

      {/* Hero header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">
          {isZh ? '行情中心' : 'Market Center'}
        </h1>
        <p className="text-sm text-muted-foreground">
          {isZh ? 'A股市场实时行情' : 'Real-time A-Share Market Data'}
          {nonIndexStocks.length > 0 && ` · ${nonIndexStocks.length} ${isZh ? '只股票' : 'stocks'}`}
        </p>
      </div>

      {/* Index cards */}
      {indexStocks.length > 0 && (
        <div className="flex gap-3 overflow-x-auto pb-1">
          {indexStocks.map(s => <IndexCard key={s.code} s={s} />)}
        </div>
      )}

      {/* Search + actions */}
      <div className="flex gap-3 items-center">
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
          variant="outline" size="sm"
          onClick={fetchMarket} disabled={loading} className="gap-1.5 shrink-0"
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
            <div className="flex items-center gap-3">
              {/* Page size selector */}
              <div className="flex items-center gap-1">
                {PAGE_SIZE_OPTIONS.map(ps => (
                  <Button
                    key={ps}
                    variant={pageSize === ps ? 'secondary' : 'ghost'}
                    size="sm" className="h-6 text-xs px-2"
                    onClick={() => setPageSize(ps)}
                  >
                    {ps}
                  </Button>
                ))}
              </div>
              <div className="h-4 w-px bg-border" />
              {/* Live indicator */}
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                {loading ? (isZh ? '加载中...' : 'Loading...') : (
                  filteredStocks.length === 0 ? '—' : `${startItem}–${endItem} / ${filteredStocks.length}`
                )}
              </div>
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

          {/* Pagination */}
          {!loading && filteredStocks.length > 0 && (
            <PaginationControls
              currentPage={safePage}
              totalPages={totalPages}
              onPageChange={(p) => setCurrentPage(p)}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
