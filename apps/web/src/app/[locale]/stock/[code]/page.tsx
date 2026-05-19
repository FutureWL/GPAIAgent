'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import ReactECharts from 'echarts-for-react';

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
const KLINE_PERIODS: PeriodType[] = ['day', 'week', 'month', 'season', 'year'];

const NAME_MAP: Record<string, string> = {
  '000001': '上证指数', '399001': '深证成指', '399006': '创业板指',
  '600519': '贵州茅台', '000858': '五粮液', '600036': '招商银行',
  '601318': '中国平安', '000333': '美的集团', '002594': '比亚迪',
  '600887': '伊利股份', '600030': '中信证券',
  '601888': '中国中免', '300750': '宁德时代', '688981': '中芯国际',
};

function fmtCap(v: number): string {
  if (v >= 10000) return (v / 10000).toFixed(2) + '万亿';
  if (v >= 1) return v.toFixed(2) + '亿';
  return (v * 10000).toFixed(0) + '万';
}

function fmtAmount(v: number): string {
  if (v >= 10000) return (v / 10000).toFixed(2) + '亿';
  return v.toFixed(2) + '万';
}

// 判断市场前缀（复用 stocks.service.ts 的同一套逻辑）
function getQtPrefix(code: string): string {
  // 指数：000开头（沪指、沪深300）、399开头（深证、创业板）
  if (code.startsWith('000') || code.startsWith('399')) return 'sh';
  return code.startsWith('6') || code.startsWith('5') ? 'sh' : 'sz';
}

// 实时行情（经本地 API → 东方财富）
async function fetchStockQuote(code: string): Promise<Quote | null> {
  try {
    const resp = await fetch(`/api/stocks/${code}/quote`, { signal: AbortSignal.timeout(10000) });
    if (!resp.ok) return null;
    const qt = await resp.json();
    if (!qt || !qt.price) return null;
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

// 分时数据（经本地 API → 腾讯）
async function fetchMinuteData(code: string): Promise<{ points: MinutePoint[]; preClose: number }> {
  try {
    const resp = await fetch(`/api/stocks/${code}/kline?period=minute`, { signal: AbortSignal.timeout(10000) });
    if (!resp.ok) return { points: [], preClose: 0 };
    const data = await resp.json();
    if (!Array.isArray(data) || data.length === 0) return { points: [], preClose: 0 };
    const points: MinutePoint[] = data.map((b: any) => ({
      time: b.date,
      price: b.close,
      volume: b.volume,
    }));
    const preClose = points[0]?.price || 0;
    return { points, preClose };
  } catch { return { points: [], preClose: 0 }; }
}

// 5日分时（经本地 API → 腾讯）
async function fetch5DayData(code: string): Promise<{ points: MinutePoint[]; preClose: number }> {
  try {
    const resp = await fetch(`/api/stocks/${code}/kline?period=5day`, { signal: AbortSignal.timeout(10000) });
    if (!resp.ok) return { points: [], preClose: 0 };
    const data = await resp.json();
    if (!Array.isArray(data) || data.length === 0) return { points: [], preClose: 0 };
    const points: MinutePoint[] = data.map((b: any) => ({
      time: b.date,
      price: b.close,
      volume: b.volume,
    }));
    const preClose = points[0]?.price || 0;
    return { points, preClose };
  } catch { return { points: [], preClose: 0 }; }
}

// 分钟K线 (1/5/15/30/60min) — 通过 API 代理
async function fetchMinuteKline(code: string, period: string): Promise<DailyBar[]> {
  try {
    const resp = await fetch(`/api/stocks/${code}/daily?period=${period}&days=300`, { signal: AbortSignal.timeout(15000) });
    if (!resp.ok) return [];
    const data = await resp.json();
    if (!Array.isArray(data)) return [];
    return data;
  } catch { return []; }
}

// 分时图 ECharts 配置
function getMinuteChartOptions(points: MinutePoint[], preClose: number) {
  if (points.length === 0) return {};
  const times = points.map(p => p.time);
  const prices = points.map(p => p.price);
  const lastPrice = prices[prices.length - 1] ?? preClose;
  const priceColor = lastPrice >= preClose ? '#ef4444' : '#22c55e';
  const areaTopColor = lastPrice >= preClose ? 'rgba(239,68,68,0.15)' : 'rgba(34,197,94,0.15)';
  const volumes = points.map(p => ({ value: p.volume, itemStyle: { color: p.price >= preClose ? 'rgba(239,68,68,0.5)' : 'rgba(34,197,94,0.5)' } }));

  // 昨收线
  const preCloseLine = Array(prices.length).fill(preClose);

  return {
    tooltip: {
      trigger: 'axis',
      formatter: (params: any[]) => {
        const p = params[0];
        return `${p.axisValue}<br/><b style="color:${priceColor}">${p.value.toFixed(2)}</b>`;
      }
    },
    grid: [
      { left: 50, right: 50, top: 20, height: '60%' },
      { left: 50, right: 50, top: '76%', height: '14%' }
    ],
    xAxis: [
      { type: 'category', data: times, boundaryGap: false, axisLine: { lineStyle: { color: '#334155' } }, axisLabel: { color: '#64748b', fontSize: 10 }, splitLine: { show: false } },
      { type: 'category', data: times, gridIndex: 1, boundaryGap: false, axisLine: { lineStyle: { color: '#334155' } }, axisLabel: { show: false } }
    ],
    yAxis: [
      { scale: true, position: 'right', axisLine: { lineStyle: { color: '#334155' } }, axisLabel: { color: '#64748b', fontSize: 10 }, splitLine: { lineStyle: { color: '#1e293b' } }, splitNumber: 4 },
      { scale: true, gridIndex: 1, position: 'right', axisLine: { lineStyle: { color: '#334155' } }, axisLabel: { show: false }, splitLine: { show: false } }
    ],
    series: [
      { name: '昨收', type: 'line', data: preCloseLine, smooth: false, symbol: 'none', lineStyle: { color: '#64748b', width: 1, type: 'dashed' }, xAxisIndex: 0, yAxisIndex: 0 },
      { name: '价格', type: 'line', data: prices, xAxisIndex: 0, yAxisIndex: 0, smooth: true, symbol: 'none', lineStyle: { color: priceColor, width: 1.5 }, areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: areaTopColor }, { offset: 1, color: 'rgba(0,0,0,0)' }] } } },
      { name: '成交量', type: 'bar', data: volumes, xAxisIndex: 1, yAxisIndex: 1, barWidth: '80%' },
    ],
  };
}

// K线图 ECharts 配置
function getCandlestickOptions(data: DailyBar[]) {
  if (data.length === 0) return {};
  const dates = data.map(d => d.date);
  const ohlc = data.map(d => [d.open, d.close, d.low, d.high]);
  const volumes = data.map(d => ({ value: d.volume, itemStyle: { color: d.close >= d.open ? '#ef4444' : '#22c55e' } }));

  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'cross' },
      formatter: (params: any[]) => {
        const idx = params[0].dataIndex;
        const d = data[idx];
        if (!d) return '';
        const color = d.close >= d.open ? '#ef4444' : '#22c55e';
        const volStr = d.volume >= 10000 ? (d.volume / 10000).toFixed(2) + '万手' : d.volume + '手';
        return `<b style="color:${color}">${d.date}</b><br/>
          开：${d.open.toFixed(2)}<br/>
          收：${d.close.toFixed(2)}<br/>
          高：${d.high.toFixed(2)}<br/>
          低：${d.low.toFixed(2)}<br/>
          量：${volStr}`;
      }
    },
    grid: [
      { left: 60, right: 20, top: 20, height: '58%' },
      { left: 60, right: 20, top: '76%', height: '14%' }
    ],
    xAxis: [
      { type: 'category', data: dates, gridIndex: 0, boundaryGap: true, axisLine: { lineStyle: { color: '#334155' } }, axisLabel: { color: '#64748b', fontSize: 10, formatter: (v: string) => v.length > 7 ? v.slice(5) : v }, splitLine: { show: true, lineStyle: { color: '#1e293b' } } },
      { type: 'category', data: dates, gridIndex: 1, boundaryGap: true, axisLine: { lineStyle: { color: '#334155' } }, axisLabel: { show: false } }
    ],
    yAxis: [
      { scale: true, gridIndex: 0, axisLine: { lineStyle: { color: '#334155' } }, axisLabel: { color: '#64748b', fontSize: 10 }, splitLine: { lineStyle: { color: '#1e293b' } } },
      { scale: true, gridIndex: 1, axisLine: { lineStyle: { color: '#334155' } }, axisLabel: { color: '#64748b', fontSize: 10, formatter: (v: number) => (v / 10000).toFixed(0) + '万' }, splitLine: { show: false } }
    ],
    series: [
      { name: 'K线', type: 'candlestick', data: ohlc, xAxisIndex: 0, yAxisIndex: 0, itemStyle: { color: '#ef4444', color0: '#22c55e', borderColor: '#ef4444', borderColor0: '#22c55e' } },
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

  // 分时数据
  const [minutePoints, setMinutePoints] = useState<MinutePoint[]>([]);
  const [preClose, setPreClose] = useState(0);
  const [minuteLoading, setMinuteLoading] = useState(false);

  // K线数据
  const [klineData, setKlineData] = useState<DailyBar[]>([]);
  const [klineLoading, setKlineLoading] = useState(false);

  const [showMore, setShowMore] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  // 加载实时行情
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

  // 加载分时数据（minute / 5day）
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
    }
  }, [activePeriod, code, quote]);

  // 加载K线数据（day / week / month / season / year）
  useEffect(() => {
    if (!code || !quote) return;
    if (activePeriod === 'minute' || activePeriod === '5day') return;
    if (MINUTE_PERIODS.includes(activePeriod)) {
      // 分钟K线
      setKlineLoading(true);
      fetchMinuteKline(code, activePeriod).then(data => {
        setKlineData(data);
        setKlineLoading(false);
      }).catch(() => setKlineLoading(false));
    } else {
      // 日/周/月/季/年K线
      setKlineLoading(true);
      fetchMinuteKline(code, activePeriod).then(data => {
        setKlineData(data);
        setKlineLoading(false);
      }).catch(() => setKlineLoading(false));
    }
  }, [activePeriod, code, quote]);

  // 点击外部关闭更多菜单
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setShowMore(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handlePeriodChange = (period: PeriodType) => {
    setActivePeriod(period);
    setShowMore(false);
  };

  const renderChart = () => {
    if (minuteLoading || klineLoading) {
      return <div className="h-[360px] flex items-center justify-center text-slate-500">加载中...</div>;
    }

    if (activePeriod === 'minute' || activePeriod === '5day') {
      if (minutePoints.length === 0) {
        return <div className="h-[360px] flex items-center justify-center text-slate-500">暂无分时数据</div>;
      }
      return <ReactECharts option={getMinuteChartOptions(minutePoints, preClose)} style={{ height: 360 }} />;
    }

    if (klineData.length === 0) {
      return <div className="h-[360px] flex items-center justify-center text-slate-500">暂无K线数据</div>;
    }
    return <ReactECharts option={getCandlestickOptions(klineData)} style={{ height: 360 }} />;
  };

  const up = quote ? parseFloat(quote.change) >= 0 : true;
  const infoRows = quote ? [
    ['今开', quote.open], ['昨收', quote.preClose],
    ['最高', quote.high], ['最低', quote.low],
    ['成交量', quote.volume], ['成交额', quote.amount],
    ['净流入', (parseFloat(quote.change) >= 0 ? '+' : '-') + quote.netInflow],
    ['流通市值', quote.circulateCap], ['总市值', quote.totalCap],
  ] : [];

  return (
    <div className="space-y-4">
      <button onClick={() => router.back()} className="flex items-center gap-1 text-sm text-slate-400 hover:text-white transition-colors">
        <span>←</span><span>返回</span>
      </button>

      {loading && <div className="text-center py-20 text-slate-500">加载中...</div>}

      {notFound && !loading && (
        <div className="text-center py-20">
          <p className="text-slate-400 mb-4">未找到股票 {code}</p>
          <button onClick={() => router.back()} className="text-blue-400 hover:text-blue-300">返回</button>
        </div>
      )}

      {quote && !loading && (
        <>
          {/* 行情卡片 */}
          <div className="bg-slate-800 rounded-xl p-5">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-bold text-white">{quote.name}</h1>
                <p className="text-slate-400 text-sm mt-1">代码 {quote.code}</p>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold" style={{ color: up ? '#ef4444' : '#22c55e' }}>
                  {quote.price}
                </div>
                <div className="text-sm mt-1" style={{ color: up ? '#ef4444' : '#22c55e' }}>
                  {up ? '+' : ''}{quote.change} ({up ? '+' : ''}{quote.changePercent}%)
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 mt-5">
              {infoRows.map(([label, val]) => (
                <div key={label} className="bg-slate-700/40 rounded-lg px-3 py-2.5">
                  <div className="text-slate-400 text-xs">{label}</div>
                  <div className={`font-medium mt-0.5 text-sm ${label === '净流入' ? (parseFloat(quote.change) >= 0 ? 'text-red-400' : 'text-green-400') : 'text-white'}`}>{val}</div>
                </div>
              ))}
            </div>

            <div className="flex gap-3 mt-4">
              <button
                onClick={() => fetch('/api/stocks/user', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ stockCode: code }) }).then(() => alert('已添加自选')).catch(() => alert('添加失败'))}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm transition-colors"
              >
                + 加入自选
              </button>
            </div>
          </div>

          {/* 图表区 */}
          <div className="bg-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-slate-200">
                {PERIODS.find(p => p.key === activePeriod)?.label}
              </h2>
              <div className="flex items-center gap-1">
                {PERIODS.slice(0, 6).map(p => (
                  <button
                    key={p.key}
                    onClick={() => handlePeriodChange(p.key)}
                    className={`px-3 py-1.5 text-sm rounded-md transition-colors ${activePeriod === p.key ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
                  >
                    {p.label}
                  </button>
                ))}
                <div className="relative" ref={moreRef}>
                  <button
                    onClick={() => setShowMore(!showMore)}
                    className={`px-3 py-1.5 text-sm rounded-md transition-colors flex items-center gap-1 ${PERIODS.slice(6).some(p => p.key === activePeriod) ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
                  >
                    更多 <span>▾</span>
                  </button>
                  {showMore && (
                    <div className="absolute right-0 top-full mt-1 bg-slate-700 rounded-md shadow-lg overflow-hidden z-10 min-w-[100px]">
                      {PERIODS.slice(6).map(p => (
                        <button
                          key={p.key}
                          onClick={() => handlePeriodChange(p.key)}
                          className={`block w-full text-left px-3 py-2 text-sm transition-colors ${activePeriod === p.key ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-600'}`}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
            {renderChart()}
          </div>
        </>
      )}
    </div>
  );
}
