'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import ReactECharts from 'echarts-for-react';
import { fmtCap, fmtAmount } from '@/lib/stock-utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface Quote {
  code: string;
  name: string;
  price: string;
  change: string;
  changePercent: string;
  open: string;
  preClose: string;
  high: string;
  low: string;
  volume: string;
  amount: string;
  netInflow: string;
  totalCap: string;
  circulateCap: string;
}

interface MinutePoint { time: string; price: number; volume: number; }
interface DailyBar { date: string; open: number; close: number; high: number; low: number; volume: number; }

type PeriodType = 'minute' | '5day' | 'day' | 'week' | 'month' | 'season' | 'year' | '1min' | '5min' | '15min' | '30min' | '60min';

const PERIODS: { key: PeriodType; label: string }[] = [
  { key: 'minute', label: '分时' },
  { key: '5day', label: '5日' },
  { key: 'day', label: '日K' },
  { key: 'week', label: '周K' },
  { key: 'month', label: '月K' },
  { key: 'season', label: '季K' },
  { key: 'year', label: '年K' },
  { key: '1min', label: '1分钟' },
  { key: '5min', label: '5分钟' },
  { key: '15min', label: '15分钟' },
  { key: '30min', label: '30分钟' },
  { key: '60min', label: '60分钟' },
];

const MINUTE_PERIODS: PeriodType[] = ['1min', '5min', '15min', '30min', '60min'];

const NAME_MAP: Record<string, string> = {
  '000001': '上证指数', '399001': '深证成指', '399006': '创业板指',
  '600519': '贵州茅台', '000858': '五粮液', '600036': '招商银行',
  '601318': '中国平安', '000333': '美的集团', '002594': '比亚迪',
  '600887': '伊利股份', '600030': '中信证券',
  '601888': '中国中免', '300750': '宁德时代', '688981': '中芯国际',
};

async function fetchStockQuote(code: string): Promise<Quote | null> {
  try {
    const resp = await fetch(`/api/stocks/${code}/quote`, { signal: AbortSignal.timeout(10000) });
    if (!resp.ok) return null;
    const qt = await resp.json();
    if (!qt || !qt.code) return null;
    return {
      code: qt.code,
      name: qt.name || NAME_MAP[code] || code,
      price: qt.price.toFixed(2),
      change: qt.change.toFixed(2),
      changePercent: qt.changePercent.toFixed(2),
      open: qt.open.toFixed(2),
      preClose: qt.preClose.toFixed(2),
      high: qt.high.toFixed(2),
      low: qt.low.toFixed(2),
      volume: qt.volume >= 10000 ? (qt.volume / 10000).toFixed(2) + '万手' : qt.volume + '手',
      amount: fmtAmount(qt.amount ?? 0),
      netInflow: fmtAmount(Math.abs(qt.netInflow ?? 0)),
      totalCap: fmtCap(qt.totalCap ?? 0),
      circulateCap: fmtCap(qt.circulateCap ?? 0),
    };
  } catch { return null; }
}

async function fetchMinuteData(code: string): Promise<{ points: MinutePoint[]; preClose: number }> {
  try {
    const resp = await fetch(`/api/stocks/${code}/kline?period=minute`, { signal: AbortSignal.timeout(10000) });
    if (!resp.ok) return { points: [], preClose: 0 };
    const data = await resp.json();
    if (!Array.isArray(data) || data.length === 0) return { points: [], preClose: 0 };
    const points: MinutePoint[] = data.map((b: any) => ({ time: b.date, price: b.close, volume: b.volume }));
    return { points, preClose: points[0]?.price || 0 };
  } catch { return { points: [], preClose: 0 }; }
}

async function fetch5DayData(code: string): Promise<{ points: MinutePoint[]; preClose: number }> {
  try {
    const resp = await fetch(`/api/stocks/${code}/kline?period=5day`, { signal: AbortSignal.timeout(10000) });
    if (!resp.ok) return { points: [], preClose: 0 };
    const data = await resp.json();
    if (!Array.isArray(data) || data.length === 0) return { points: [], preClose: 0 };
    const points: MinutePoint[] = data.map((b: any) => ({ time: b.date, price: b.close, volume: b.volume }));
    return { points, preClose: points[0]?.price || 0 };
  } catch { return { points: [], preClose: 0 }; }
}

async function fetchMinuteKline(code: string, period: string): Promise<DailyBar[]> {
  try {
    const resp = await fetch(`/api/stocks/${code}/daily?period=${period}&days=300`, { signal: AbortSignal.timeout(15000) });
    if (!resp.ok) return [];
    const data = await resp.json();
    return Array.isArray(data) ? data : [];
  } catch { return []; }
}

function getMinuteChartOptions(points: MinutePoint[], preClose: number) {
  if (points.length === 0) return {};
  const times = points.map(p => p.time);
  const prices = points.map(p => p.price);
  const lastPrice = prices[prices.length - 1] ?? preClose;
  const up = lastPrice >= preClose;
  const priceColor = up ? 'hsl(var(--stock-up))' : 'hsl(var(--stock-down))';
  const areaTopColor = up ? 'rgba(239,68,68,0.12)' : 'rgba(34,197,94,0.12)';
  const volumes = points.map(p => ({
    value: p.volume,
    itemStyle: { color: p.price >= preClose ? 'rgba(239,68,68,0.45)' : 'rgba(34,197,94,0.45)' }
  }));
  const preCloseLine = Array(prices.length).fill(preClose);
  return {
    tooltip: { trigger: 'axis', formatter: (params: any[]) => `${params[0].axisValue}<br/><b style="color:${priceColor}">${params[0].value.toFixed(2)}</b>` },
    grid: [{ left: 50, right: 50, top: 20, height: '60%' }, { left: 50, right: 50, top: '76%', height: '14%' }],
    xAxis: [
      { type: 'category', data: times, boundaryGap: false, axisLine: { lineStyle: { color: 'hsl(var(--border))' } }, axisLabel: { color: 'hsl(var(--muted-foreground))', fontSize: 10 }, splitLine: { show: false } },
      { type: 'category', data: times, gridIndex: 1, boundaryGap: false, axisLine: { lineStyle: { color: 'hsl(var(--border))' } }, axisLabel: { show: false } }
    ],
    yAxis: [
      { scale: true, position: 'right', axisLine: { lineStyle: { color: 'hsl(var(--border))' } }, axisLabel: { color: 'hsl(var(--muted-foreground))', fontSize: 10 }, splitLine: { lineStyle: { color: 'hsl(var(--border))' }, splitNumber: 4 } },
      { scale: true, gridIndex: 1, position: 'right', axisLine: { lineStyle: { color: 'hsl(var(--border))' } }, axisLabel: { show: false }, splitLine: { show: false } }
    ],
    series: [
      { name: '昨收', type: 'line', data: preCloseLine, smooth: false, symbol: 'none', lineStyle: { color: 'hsl(var(--muted-foreground))', width: 1, type: 'dashed' }, xAxisIndex: 0, yAxisIndex: 0 },
      { name: '价格', type: 'line', data: prices, xAxisIndex: 0, yAxisIndex: 0, smooth: true, symbol: 'none', lineStyle: { color: priceColor, width: 1.5 }, areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: areaTopColor }, { offset: 1, color: 'rgba(0,0,0,0)' }] } } },
      { name: '成交量', type: 'bar', data: volumes, xAxisIndex: 1, yAxisIndex: 1, barWidth: '80%' },
    ],
  };
}

function getCandlestickOptions(data: DailyBar[]) {
  if (data.length === 0) return {};
  const dates = data.map(d => d.date);
  const ohlc = data.map(d => [d.open, d.close, d.low, d.high]);
  const volumes = data.map(d => ({ value: d.volume, itemStyle: { color: d.close >= d.open ? 'hsl(var(--stock-up))' : 'hsl(var(--stock-down))' } }));
  return {
    tooltip: {
      trigger: 'axis', axisPointer: { type: 'cross' },
      formatter: (params: any[]) => {
        const idx = params[0].dataIndex;
        const d = data[idx];
        if (!d) return '';
        const up = d.close >= d.open;
        const color = up ? 'hsl(var(--stock-up))' : 'hsl(var(--stock-down))';
        const volStr = d.volume >= 10000 ? (d.volume / 10000).toFixed(2) + '万手' : d.volume + '手';
        return `<b style="color:${color}">${d.date}</b><br/>开：${d.open.toFixed(2)}<br/>收：${d.close.toFixed(2)}<br/>高：${d.high.toFixed(2)}<br/>低：${d.low.toFixed(2)}<br/>量：${volStr}`;
      }
    },
    grid: [{ left: 60, right: 20, top: 20, height: '58%' }, { left: 60, right: 20, top: '76%', height: '14%' }],
    xAxis: [
      { type: 'category', data: dates, gridIndex: 0, boundaryGap: true, axisLine: { lineStyle: { color: 'hsl(var(--border))' } }, axisLabel: { color: 'hsl(var(--muted-foreground))', fontSize: 10, formatter: (v: string) => v.length > 7 ? v.slice(5) : v }, splitLine: { show: true, lineStyle: { color: 'hsl(var(--border))' } } },
      { type: 'category', data: dates, gridIndex: 1, boundaryGap: true, axisLine: { lineStyle: { color: 'hsl(var(--border))' } }, axisLabel: { show: false } }
    ],
    yAxis: [
      { scale: true, gridIndex: 0, axisLine: { lineStyle: { color: 'hsl(var(--border))' } }, axisLabel: { color: 'hsl(var(--muted-foreground))', fontSize: 10 }, splitLine: { lineStyle: { color: 'hsl(var(--border))' } } },
      { scale: true, gridIndex: 1, axisLine: { lineStyle: { color: 'hsl(var(--border))' } }, axisLabel: { color: 'hsl(var(--muted-foreground))', fontSize: 10, formatter: (v: number) => (v / 10000).toFixed(0) + '万' }, splitLine: { show: false } }
    ],
    series: [
      { name: 'K线', type: 'candlestick', data: ohlc, xAxisIndex: 0, yAxisIndex: 0, itemStyle: { color: 'hsl(var(--stock-up))', color0: 'hsl(var(--stock-down))', borderColor: 'hsl(var(--stock-up))', borderColor0: 'hsl(var(--stock-down))' } },
      { name: '成交量', type: 'bar', data: volumes, xAxisIndex: 1, yAxisIndex: 1, barWidth: '60%' }
    ],
    backgroundColor: 'transparent',
  };
}

export default function StockDetailPage() {
  const params = useParams();
  const router = useRouter();
  const code = String(params.code || '').replace(/^(sh|sz)/, '');
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [activePeriod, setActivePeriod] = useState<PeriodType>('minute');
  const [minutePoints, setMinutePoints] = useState<MinutePoint[]>([]);
  const [preClose, setPreClose] = useState(0);
  const [minuteLoading, setMinuteLoading] = useState(false);
  const [klineData, setKlineData] = useState<DailyBar[]>([]);
  const [klineLoading, setKlineLoading] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!code) return;
    setLoading(true);
    setQuote(null);
    setMinutePoints([]);
    setKlineData([]);
    setActivePeriod('minute');
    fetchStockQuote(code).then(q => {
      if (!q) { setNotFound(true); setLoading(false); return; }
      setQuote(q);
      setPreClose(parseFloat(q.preClose));
      setNotFound(false);
      setLoading(false);
    }).catch(() => { setNotFound(true); setLoading(false); });
  }, [code]);

  useEffect(() => {
    if (!code || !quote) return;
    if (activePeriod === 'minute') {
      setMinuteLoading(true);
      fetchMinuteData(code).then(({ points, preClose: pc }) => { setMinutePoints(points); if (pc) setPreClose(pc); setMinuteLoading(false); }).catch(() => setMinuteLoading(false));
    } else if (activePeriod === '5day') {
      setMinuteLoading(true);
      fetch5DayData(code).then(({ points, preClose: pc }) => { setMinutePoints(points); if (pc) setPreClose(pc); setMinuteLoading(false); }).catch(() => setMinuteLoading(false));
    }
  }, [activePeriod, code, quote]);

  useEffect(() => {
    if (!code || !quote) return;
    if (activePeriod === 'minute' || activePeriod === '5day') return;
    setKlineLoading(true);
    fetchMinuteKline(code, activePeriod).then(data => { setKlineData(data); setKlineLoading(false); }).catch(() => setKlineLoading(false));
  }, [activePeriod, code, quote]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setShowMore(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handlePeriodChange = (period: PeriodType) => { setActivePeriod(period); setShowMore(false); };

  const renderChart = () => {
    if (minuteLoading || klineLoading) return <div className="h-[360px] sm:h-[480px] flex items-center justify-center text-muted-foreground">加载中...</div>;
    if (activePeriod === 'minute' || activePeriod === '5day') {
      if (minutePoints.length === 0) return <div className="h-[360px] sm:h-[480px] flex items-center justify-center text-muted-foreground">暂无分时数据</div>;
      return <ReactECharts option={getMinuteChartOptions(minutePoints, preClose)} style={{ height: '360px' }} />;
    }
    if (klineData.length === 0) return <div className="h-[360px] sm:h-[480px] flex items-center justify-center text-muted-foreground">暂无K线数据</div>;
    return <ReactECharts option={getCandlestickOptions(klineData)} style={{ height: '360px' }} />;
  };

  const up = quote ? parseFloat(quote.change) >= 0 : true;
  const priceColor = up ? 'text-stock-up' : 'text-stock-down';
  const infoRows = quote ? [
    ['今开', quote.open], ['昨收', quote.preClose],
    ['最高', quote.high], ['最低', quote.low],
    ['成交量', quote.volume], ['成交额', quote.amount],
    ['净流入', (up ? '+' : '-') + quote.netInflow],
    ['流通市值', quote.circulateCap], ['总市值', quote.totalCap],
  ] : [];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-4">

      {/* Back button */}
      <Button variant="ghost" size="sm" onClick={() => router.back()} className="gap-1.5 text-muted-foreground hover:text-foreground -ml-2">
        <span>←</span> {up ? '返回' : '返回'}
      </Button>

      {loading && <div className="text-center py-20 text-muted-foreground">加载中...</div>}

      {notFound && !loading && (
        <Card className="py-16 text-center">
          <CardContent className="text-muted-foreground">
            <p className="mb-4">未找到股票 {code}</p>
            <Button variant="outline" size="sm" onClick={() => router.back()}>返回</Button>
          </CardContent>
        </Card>
      )}

      {quote && !loading && (
        <>
          {/* Quote card */}
          <Card>
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight">{quote.name}</h1>
                  <p className="text-sm text-muted-foreground mt-1 font-mono">{quote.code}</p>
                </div>
                <div className="text-right">
                  <div className={`text-3xl font-bold font-mono tabular-nums ${priceColor}`}>{quote.price}</div>
                  <div className={`text-sm font-mono tabular-nums mt-1 ${priceColor}`}>
                    {up ? '+' : ''}{quote.change} &nbsp; ({up ? '+' : ''}{quote.changePercent}%)
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 mt-5">
                {infoRows.map(([label, val]) => (
                  <div key={label} className="bg-muted rounded-lg px-3 py-2.5">
                    <div className="text-xs text-muted-foreground">{label}</div>
                    <div className={cn(
                      'font-medium text-sm font-mono tabular-nums mt-0.5',
                      label === '净流入' ? (up ? 'text-stock-up' : 'text-stock-down') : 'text-foreground'
                    )}>{val}</div>
                  </div>
                ))}
              </div>

              <div className="flex gap-3 mt-5">
                <Button
                  size="sm"
                  onClick={() => fetch('/api/stocks/user', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ stockCode: code }) }).then(() => alert('已添加自选')).catch(() => alert('添加失败'))}
                >
                  + 加入自选
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Chart card */}
          <Card>
            <CardHeader className="pb-0 px-4 pt-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">
                  {PERIODS.find(p => p.key === activePeriod)?.label}
                </CardTitle>
                <div className="flex items-center gap-1 flex-wrap justify-end">
                  {PERIODS.slice(0, 6).map(p => (
                    <Button
                      key={p.key}
                      variant={activePeriod === p.key ? 'default' : 'outline'}
                      size="sm"
                      className="h-7 text-xs px-2.5"
                      onClick={() => handlePeriodChange(p.key)}
                    >
                      {p.label}
                    </Button>
                  ))}
                  <div className="relative" ref={moreRef}>
                    <Button
                      variant={PERIODS.slice(6).some(p => p.key === activePeriod) ? 'default' : 'outline'}
                      size="sm"
                      className="h-7 text-xs px-2.5 gap-1"
                      onClick={() => setShowMore(!showMore)}
                    >
                      更多 <span>▾</span>
                    </Button>
                    {showMore && (
                      <div className="absolute right-0 top-full mt-1 bg-card border border-border rounded-md shadow-lg overflow-hidden z-10 min-w-[100px]">
                        {PERIODS.slice(6).map(p => (
                          <Button
                            key={p.key}
                            variant={activePeriod === p.key ? 'default' : 'ghost'}
                            size="sm"
                            className="w-full justify-start h-8 text-xs rounded-none"
                            onClick={() => handlePeriodChange(p.key)}
                          >
                            {p.label}
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              {renderChart()}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
