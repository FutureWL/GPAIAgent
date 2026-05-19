'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter, usePathname } from 'next/navigation';
import ReactECharts from 'echarts-for-react';
import { fmtCap, fmtAmount } from '@/lib/stock-utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type PeriodType = 'minute' | '5day' | 'day' | 'week' | 'month' | '1min' | '5min' | '15min' | '30min' | '60min';

const PERIODS: { key: PeriodType; label: string }[] = [
  { key: 'minute',  label: '分时' },
  { key: '5day',    label: '5日' },
  { key: 'day',     label: '日K' },
  { key: 'week',    label: '周K' },
  { key: 'month',   label: '月K' },
  { key: '1min',    label: '1分钟' },
  { key: '5min',    label: '5分钟' },
  { key: '15min',   label: '15分钟' },
  { key: '30min',   label: '30分钟' },
  { key: '60min',   label: '60分钟' },
];

const MAIN_PERIODS = PERIODS.slice(0, 5);
const SUB_PERIODS  = PERIODS.slice(5);

interface Quote {
  code: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  open: number;
  preClose: number;
  high: number;
  low: number;
  volume: number;
  amount: number;
  turnover: number;
  totalCap: number;
  circulateCap: number;
  netInflow: number;
}

interface MinutePoint { time: string; price: number; volume: number; }
interface DailyBar { date: string; open: number; close: number; high: number; low: number; volume: number; }

function parseTencentLine(raw: string): Quote | null {
  try {
    const eqIdx = raw.indexOf('=');
    if (eqIdx < 0) return null;
    const parts = raw.substring(eqIdx + 2).split('~');
    if (parts.length < 45) return null;
    const code = parts[2] || '';
    const name = parts[1] || code;
    const price = parseFloat(parts[3]) || 0;
    const change = parseFloat(parts[31]) || 0;
    const changePercent = parseFloat(parts[32]) || 0;
    const open = parseFloat(parts[5]) || 0;
    const preClose = parseFloat(parts[4]) || 0;
    const volume = parseInt(parts[6]) || 0;
    const amount = parseFloat(parts[37]) || 0;
    const turnover = parseFloat(parts[38]) || 0;
    const high = parseFloat(parts[33]) || 0;
    const low = parseFloat(parts[34]) || 0;
    const totalCap = parseFloat(parts[44]) || 0;
    const circulateCap = parseFloat(parts[45]) || 0;
    const netInflow = parseFloat(parts[74]) || 0;
    return {
      code, name: name.replace(/["\s]/g, ''),
      price, change, changePercent,
      open, preClose, high, low, volume, amount, turnover,
      totalCap, circulateCap, netInflow,
    };
  } catch { return null; }
}

async function fetchQuote(code: string): Promise<Quote | null> {
  const prefix = code.startsWith('sh') ? 'sh' : 'sz';
  const c = code.replace(/^(sh|sz)/, '');
  const url = `https://qt.gtimg.cn/q=${prefix}${c}`;
  const resp = await fetch(url, {
    headers: { Referer: 'https://finance.qq.com', 'User-Agent': 'Mozilla/5.0' },
    signal: AbortSignal.timeout(10000),
  });
  if (!resp.ok) return null;
  const buffer = await resp.arrayBuffer();
  const text = new TextDecoder('gbk').decode(Buffer.from(buffer));
  return parseTencentLine(text.trim());
}

async function fetchMinuteData(code: string): Promise<{ points: MinutePoint[]; preClose: number }> {
  try {
    const prefix = code.startsWith('sh') ? 'sh' : 'sz';
    const c = code.replace(/^(sh|sz)/, '');
    const url = `https://web.ifzq.gtimg.cn/appstock/app/minute/query?_var=minutedata&param=${prefix}${c},${c}`;
    const resp = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!resp.ok) return { points: [], preClose: 0 };
    const text = await resp.text();
    const json = text.replace(/^[^=]+=/, '');
    const data = JSON.parse(json);
    const qfq = data.data?.[c]?.data;
    if (!qfq) return { points: [], preClose: 0 };
    const preClose = data.data?.[c]?.pc || 0;
    const lines = Array.isArray(qfq) ? qfq : qfq.data || [];
    const points: MinutePoint[] = lines.map((p: string[]) => ({ time: p[0], price: parseFloat(p[1]) || 0, volume: parseFloat(p[2]) || 0 }));
    return { points, preClose };
  } catch { return { points: [], preClose: 0 }; }
}

async function fetch5DayData(code: string): Promise<{ points: MinutePoint[]; preClose: number }> {
  try {
    const prefix = code.startsWith('sh') ? 'sh' : 'sz';
    const c = code.replace(/^(sh|sz)/, '');
    const url = `https://web.ifzq.gtimg.cn/appstock/app/fqkline/get?_var=kline_dayqfq&param=${prefix}${c},day,,,,,100,qfq`;
    const resp = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!resp.ok) return { points: [], preClose: 0 };
    const text = await resp.text();
    const json = text.replace(/^[^=]+=/, '');
    const data = JSON.parse(json);
    const dayData = data.data?.[c]?.data || [];
    if (!dayData.length) return { points: [], preClose: 0 };
    const preClose = parseFloat(dayData[0][1]) || 0;
    const points: MinutePoint[] = dayData.map((d: string[]) => ({ time: d[0], price: parseFloat(d[2]) || 0, volume: parseFloat(d[5]) || 0 }));
    return { points, preClose };
  } catch { return { points: [], preClose: 0 }; }
}

async function fetchKlineData(code: string, period: string, locale = 'zh'): Promise<DailyBar[]> {
  try {
    const resp = await fetch(`/${locale}/kline-fetch/${code}?period=${period}`, { signal: AbortSignal.timeout(15000) });
    if (!resp.ok) return [];
    const data = await resp.json();
    const klines: any[] = Array.isArray(data) ? data : [];
    return klines.map((d: any) => ({
      date: d.day, open: +d.open, close: +d.close, high: +d.high, low: +d.low, volume: +d.volume,
    }));
  } catch { return []; }
}

function minuteChartOptions(points: MinutePoint[], preClose: number, up: boolean) {
  if (!points.length) return {};
  const times  = points.map(p => p.time);
  const prices = points.map(p => p.price);
  const lastPrice = prices[prices.length - 1] ?? preClose;
  const priceColor = up ? '#ef4444' : '#22c55e';
  const areaTop = up ? 'rgba(239,68,68,0.10)' : 'rgba(34,197,94,0.10)';
  const volumes = points.map(p => ({ value: p.volume, itemStyle: { color: p.price >= preClose ? 'rgba(239,68,68,0.40)' : 'rgba(34,197,94,0.40)' } }));
  return {
    tooltip: { trigger: 'axis', formatter: (params: any[]) => `${params[0].axisValue}<br/><b style="color:${priceColor}">${params[0].value?.toFixed(2) ?? '—'}</b>` },
    grid: [{ left: 52, right: 12, top: 16, height: '58%' }, { left: 52, right: 12, top: '76%', height: '14%' }],
    xAxis: [
      { type: 'category', data: times, boundaryGap: false, axisLine: { lineStyle: { color: '#e5e7eb' } }, axisLabel: { color: '#6b7280', fontSize: 10 }, splitLine: { show: false } },
      { type: 'category', data: times, boundaryGap: false, gridIndex: 1, axisLine: { lineStyle: { color: '#e5e7eb' } }, axisLabel: { show: false } }
    ],
    yAxis: [
      { scale: true, position: 'right', axisLine: { lineStyle: { color: '#e5e7eb' } }, axisLabel: { color: '#6b7280', fontSize: 10 }, splitLine: { lineStyle: { color: '#f3f4f6' } } },
      { scale: true, gridIndex: 1, position: 'right', axisLine: { lineStyle: { color: '#e5e7eb' } }, axisLabel: { show: false }, splitLine: { show: false } }
    ],
    series: [
      { name: '昨收', type: 'line', data: Array(prices.length).fill(preClose), smooth: false, symbol: 'none', lineStyle: { color: '#9ca3af', width: 1, type: 'dashed' }, xAxisIndex: 0, yAxisIndex: 0 },
      { name: '价格', type: 'line', data: prices, smooth: true, symbol: 'none', lineStyle: { color: priceColor, width: 1.5 }, areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: areaTop }, { offset: 1, color: 'rgba(0,0,0,0)' }] } }, xAxisIndex: 0, yAxisIndex: 0 },
      { name: '成交量', type: 'bar', data: volumes, xAxisIndex: 1, yAxisIndex: 1, barWidth: '80%' }
    ],
  };
}

function candlestickOptions(data: DailyBar[]) {
  if (!data.length) return {};
  const dates  = data.map(d => d.date);
  const ohlc   = data.map(d => [d.open, d.close, d.low, d.high]);
  const volumes = data.map(d => ({ value: d.volume, itemStyle: { color: d.close >= d.open ? '#ef4444' : '#22c55e' } }));
  return {
    tooltip: {
      trigger: 'axis', axisPointer: { type: 'cross' },
      formatter: (params: any[]) => {
        const idx = params[0]?.dataIndex;
        if (idx == null) return '';
        const d = data[idx];
        const up = d.close >= d.open;
        const c = up ? '#ef4444' : '#22c55e';
        const vol = d.volume >= 100000000 ? (d.volume / 100000000).toFixed(2) + '亿' : d.volume >= 10000 ? (d.volume / 10000).toFixed(2) + '万' : d.volume;
        return `<b style="color:${c}">${d.date}</b><br/>开：${d.open.toFixed(2)}<br/>收：${d.close.toFixed(2)}<br/>高：${d.high.toFixed(2)}<br/>低：${d.low.toFixed(2)}<br/>量：${vol}`;
      }
    },
    grid: [{ left: 60, right: 12, top: 16, height: '58%' }, { left: 60, right: 12, top: '76%', height: '14%' }],
    xAxis: [
      { type: 'category', data: dates, gridIndex: 0, boundaryGap: true, axisLine: { lineStyle: { color: '#e5e7eb' } }, axisLabel: { color: '#6b7280', fontSize: 10, formatter: (v: string) => v.length > 7 ? v.slice(5) : v }, splitLine: { show: true, lineStyle: { color: '#f3f4f6' } } },
      { type: 'category', data: dates, gridIndex: 1, boundaryGap: true, axisLine: { lineStyle: { color: '#e5e7eb' } }, axisLabel: { show: false } }
    ],
    yAxis: [
      { scale: true, gridIndex: 0, axisLine: { lineStyle: { color: '#e5e7eb' } }, axisLabel: { color: '#6b7280', fontSize: 10 }, splitLine: { lineStyle: { color: '#f3f4f6' } } },
      { scale: true, gridIndex: 1, axisLine: { lineStyle: { color: '#e5e7eb' } }, axisLabel: { color: '#6b7280', fontSize: 10, formatter: (v: number) => v >= 100000000 ? (v / 100000000).toFixed(0) + '亿' : v >= 10000 ? (v / 10000).toFixed(0) + '万' : v }, splitLine: { show: false } }
    ],
    series: [
      { name: 'K线', type: 'candlestick', data: ohlc, xAxisIndex: 0, yAxisIndex: 0, itemStyle: { color: '#ef4444', color0: '#22c55e', borderColor: '#ef4444', borderColor0: '#22c55e' } },
      { name: '成交量', type: 'bar', data: volumes, xAxisIndex: 1, yAxisIndex: 1, barWidth: '60%' }
    ],
  };
}

export default function StockDetailPage() {
  const params = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const locale = pathname.split('/')[1] || 'zh';

  // 指数代码: 000001=上证, 399001=深证, 399006=创业板
  const rawCode = String(params.code || '');
  const code = rawCode.startsWith('sh') || rawCode.startsWith('sz')
    ? rawCode
    : rawCode === '000001' || rawCode === '399001' || rawCode === '399006'
      ? (rawCode === '000001' ? 'sh000001' : rawCode === '399001' ? 'sz399001' : 'sz399006')
      : `sz${rawCode}`;

  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const [activePeriod, setActivePeriod] = useState<PeriodType>('day');
  const [minutePoints, setMinutePoints] = useState<MinutePoint[]>([]);
  const [preClose, setPreClose] = useState(0);
  const [minuteLoading, setMinuteLoading] = useState(false);
  const [klineData, setKlineData] = useState<DailyBar[]>([]);
  const [klineLoading, setKlineLoading] = useState(false);

  useEffect(() => {
    if (!code) return;
    setLoading(true);
    setQuote(null);
    fetchQuote(code).then(q => {
      setQuote(q);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [code]);

  useEffect(() => {
    if (!code || !quote) return;
    if (activePeriod === 'minute') {
      setMinuteLoading(true);
      fetchMinuteData(code).then(({ points, preClose: pc }) => {
        setMinutePoints(points);
        if (pc) setPreClose(pc);
        setMinuteLoading(false);
      }).catch(() => setMinuteLoading(false));
    } else if (activePeriod === '5day') {
      setMinuteLoading(true);
      fetch5DayData(code).then(({ points, preClose: pc }) => {
        setMinutePoints(points);
        if (pc) setPreClose(pc);
        setMinuteLoading(false);
      }).catch(() => setMinuteLoading(false));
    } else {
      setKlineLoading(true);
      fetchKlineData(code, activePeriod, locale).then(data => {
        setKlineData(data);
        setKlineLoading(false);
      }).catch(() => setKlineLoading(false));
    }
  }, [activePeriod, code, quote]);

  const up = quote ? quote.change >= 0 : true;

  const renderChart = () => {
    if ((minuteLoading || klineLoading)) {
      return <div className="h-[340px] flex items-center justify-center text-muted-foreground text-sm">加载中...</div>;
    }
    if (activePeriod === 'minute' || activePeriod === '5day') {
      if (!minutePoints.length) return <div className="h-[340px] flex items-center justify-center text-muted-foreground text-sm">暂无分时数据</div>;
      return <ReactECharts option={minuteChartOptions(minutePoints, preClose || quote?.preClose || 0, up)} style={{ height: 340 }} />;
    }
    if (!klineData.length) return <div className="h-[340px] flex items-center justify-center text-muted-foreground text-sm">暂无K线数据</div>;
    return <ReactECharts option={candlestickOptions(klineData)} style={{ height: 340 }} />;
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3" />
          <div className="h-32 bg-muted rounded" />
          <div className="h-[340px] bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        <Button variant="ghost" size="sm" onClick={() => router.back()} className="mb-4 gap-1.5 text-muted-foreground">← 返回</Button>
        <Card className="py-16 text-center">
          <CardContent className="text-muted-foreground">
            <p className="mb-4">未找到股票 {code}</p>
            <Button variant="outline" size="sm" onClick={() => router.back()}>返回</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const priceColor = up ? 'text-stock-up' : 'text-stock-down';
  const priceBg    = up ? 'bg-stock-up'    : 'bg-stock-down';
  const volColor   = up ? '#ef4444' : '#22c55e';

  const volStr = (v: number) =>
    v >= 100000000 ? (v / 100000000).toFixed(2) + '亿' :
    v >= 10000     ? (v / 10000).toFixed(2) + '万' : v;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 space-y-3">

      {/* ── 顶部导航栏 ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.back()} className="gap-1 text-muted-foreground hover:text-foreground px-2">
            <span className="text-base">←</span>
          </Button>
          <div>
            <h1 className="text-xl font-bold tracking-tight leading-none">{quote.name}</h1>
            <p className="text-xs text-muted-foreground font-mono mt-0.5">{code.toUpperCase()}</p>
          </div>
        </div>
        <Button
          size="sm"
          className="gap-1.5 text-xs"
          onClick={() => fetch('/api/stocks/user', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ stockCode: code }) }).then(() => alert('已添加自选')).catch(() => alert('添加失败'))}
        >
          + 自选
        </Button>
      </div>

      {/* ── 价格区 ── */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-end justify-between">
            {/* 左：价格 */}
            <div>
              <div className={cn('text-4xl font-bold font-mono tabular-nums', priceColor)}>
                {quote.price > 0 ? quote.price.toFixed(2) : '—'}
              </div>
              <div className={cn('flex items-center gap-2 mt-1.5 text-sm font-mono tabular-nums', priceColor)}>
                <span>{up ? '+' : ''}{quote.change >= 0 ? '+' : ''}{quote.change.toFixed(2)}</span>
                <span className={cn('inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-medium', priceBg, 'text-white')}>
                  {up ? '▲' : '▼'} {Math.abs(quote.changePercent).toFixed(2)}%
                </span>
              </div>
            </div>
            {/* 右：关键指标 */}
            <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-right">
              {[
                ['今开', quote.open.toFixed(2)],
                ['昨收', quote.preClose.toFixed(2)],
                ['最高', quote.high.toFixed(2)],
                ['最低', quote.low.toFixed(2)],
              ].map(([label, val]) => (
                <div key={label}>
                  <span className="text-xs text-muted-foreground">{label}</span>
                  <span className="ml-2 text-sm font-mono tabular-nums font-medium">{val}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 底部四条：成交量 / 成交额 / 换手率 / 净流入 */}
          <div className="grid grid-cols-4 gap-3 mt-4 pt-3 border-t border-border">
            {[
              ['成交量', volStr(quote.volume)],
              ['成交额',  fmtAmount(quote.amount)],
              ['换手率',  quote.turnover > 0 ? quote.turnover.toFixed(2) + '%' : '—'],
              ['净流入',  (quote.netInflow >= 0 ? '+' : '') + fmtAmount(Math.abs(quote.netInflow))],
            ].map(([label, val]) => (
              <div key={label} className="bg-muted/50 rounded-lg px-3 py-2 text-center">
                <div className="text-xs text-muted-foreground">{label}</div>
                <div className="text-sm font-mono tabular-nums font-medium mt-0.5">{val}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ── 周期选择 + 图表 ── */}
      <Card>
        <CardHeader className="pb-0 px-4 pt-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <CardTitle className="text-sm font-medium">
              {PERIODS.find(p => p.key === activePeriod)?.label ?? 'K线'}
            </CardTitle>
            <div className="flex items-center gap-1 flex-wrap">
              {MAIN_PERIODS.map(p => (
                <Button
                  key={p.key}
                  variant={activePeriod === p.key ? 'default' : 'outline'}
                  size="sm" className="h-7 text-xs px-2.5"
                  onClick={() => setActivePeriod(p.key)}
                >
                  {p.label}
                </Button>
              ))}
              <div className="relative">
                <Button
                  variant={SUB_PERIODS.some(p => p.key === activePeriod) ? 'default' : 'outline'}
                  size="sm" className="h-7 text-xs px-2 gap-1"
                  onClick={(e) => {
                    const btn = e.currentTarget.parentElement!.querySelector('.sub-menu') as HTMLElement | null;
                    if (btn) btn.classList.toggle('hidden');
                  }}
                >
                  更多 <span>▾</span>
                </Button>
                <div className="sub-menu hidden absolute right-0 top-full mt-1 bg-card border border-border rounded-md shadow-lg z-20 overflow-hidden min-w-[110px]">
                  {SUB_PERIODS.map(p => (
                    <button
                      key={p.key}
                      className={cn('w-full text-left px-3 py-1.5 text-xs hover:bg-accent transition-colors', activePeriod === p.key && 'bg-accent font-medium')}
                      onClick={() => { setActivePeriod(p.key); document.querySelector('.sub-menu')?.classList.add('hidden'); }}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-2">
          {renderChart()}
        </CardContent>
      </Card>

      {/* ── 底部指标 grid ── */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-y-3 gap-x-4">
            {[
              ['总市值', quote.totalCap ? fmtCap(quote.totalCap) : '—'],
              ['流通值', quote.circulateCap ? fmtCap(quote.circulateCap) : '—'],
              ['市盈率(TTM)', '—'],
              ['市净率', '—'],
            ].map(([label, val]) => (
              <div key={label} className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{label}</span>
                <span className="text-sm font-mono font-medium">{val}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

    </div>
  );
}
