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

async function fetchStockQuote(code: string): Promise<Quote | null> {
  const prefix = code.startsWith('sh') || code.startsWith('sz') ? '' : (code.startsWith('6') || code.startsWith('5') ? 'sh' : 'sz');
  const url = `https://qt.gtimg.cn/q=${prefix}${code}`;
  try {
    const resp = await fetch(url, { headers: { Referer: 'https://finance.qq.com', 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(8000) });
    if (!resp.ok) return null;
    const text = await resp.text();
    const eq = text.indexOf('=');
    if (eq < 0) return null;
    const raw = text.substring(eq + 2);
    const parts = raw.split('~');
    if (parts.length < 40) return null;
    const rawName = parts[1];
    const name = NAME_MAP[code.replace(/^(sh|sz)/, '')] || rawName.replace(/["\s]/g, '');
    const price = parseFloat(parts[3]) || 0;
    const preClose = parseFloat(parts[4]) || 0;
    const change = parseFloat(parts[31]) || 0;
    const changePercent = parseFloat(parts[32]) || 0;
    // 扩展字段
    const volumeRaw = parseInt(parts[6]) || 0;            // 成交量(手)
    const amountRaw = parseFloat(parts[37]) || 0;          // 成交额(万元)
    const netInflowRaw = parseFloat(parts[74]) || 0;       // 净流入(万元)
    const totalCapRaw = parseFloat(parts[44]) || 0;        // 总市值(亿元)
    const circulateCapRaw = parseFloat(parts[45]) || 0;    // 流通市值(亿元)
    return {
      code: parts[2],
      name,
      price: price.toFixed(2),
      change: change.toFixed(2),
      changePercent: changePercent.toFixed(2),
      open: parseFloat(parts[5]).toFixed(2),
      preClose: preClose.toFixed(2),
      high: parseFloat(parts[33]).toFixed(2),
      low: parseFloat(parts[34]).toFixed(2),
      volume: volumeRaw >= 10000 ? (volumeRaw / 10000).toFixed(2) + '万手' : volumeRaw + '手',
      amount: fmtAmount(amountRaw),
      netInflow: fmtAmount(Math.abs(netInflowRaw)),
      totalCap: fmtCap(totalCapRaw),
      circulateCap: fmtCap(circulateCapRaw),
    };
  } catch { return null; }
}

async function fetchMinuteData(code: string): Promise<MinutePoint[]> {
  const qtCode = code.startsWith('6') ? `sh${code}` : `sz${code}`;
  const url = `https://web.ifzq.gtimg.cn/appstock/app/minute/query?code=${qtCode}`;
  try {
    const resp = await fetch(url, { headers: { Referer: 'https://finance.qq.com', 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(8000) });
    if (!resp.ok) return [];
    const json = await resp.json();
    const raw = json?.data?.[qtCode]?.data?.data;
    if (!Array.isArray(raw) || raw.length === 0) return [];
    const points: MinutePoint[] = [];
    let prevVol = 0;
    for (const line of raw) {
      const pts = line.trim().split(/\s+/);
      if (pts.length < 3) continue;
      const [h, m] = pts[0].split(':');
      const price = parseFloat(pts[1]) || 0;
      const cumVol = parseInt(pts[2]) || 0;
      const volume = cumVol - prevVol;
      prevVol = cumVol;
      points.push({ time: `${h}:${m}`, price, volume: Math.max(0, volume) });
    }
    return points;
  } catch { return []; }
}

async function fetch5DayData(code: string): Promise<{ data: MinutePoint[]; preClose: number }> {
  const qtCode = code.startsWith('6') ? `sh${code}` : `sz${code}`;
  const url = `https://web.ifzq.gtimg.cn/appstock/app/minute/query?code=${qtCode}&_var=minutedata`;
  try {
    const resp = await fetch(url, { headers: { Referer: 'https://finance.qq.com', 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(8000) });
    if (!resp.ok) return { data: [], preClose: 0 };
    const text = await resp.text();
    const match = text.match(/=\s*(\{.*\})/);
    if (!match) return { data: [], preClose: 0 };
    const json = JSON.parse(match[1]);
    const qtData = json?.data?.[qtCode]?.data;
    if (!qtData) return { data: [], preClose: 0 };
    const preClose = qtData.preClose || 0;
    const days = qtData.days || [];
    const allPoints: MinutePoint[] = [];
    for (const day of days) {
      const dayData = qtData[day] as string[];
      if (!Array.isArray(dayData)) continue;
      let prevVol = 0;
      for (const line of dayData) {
        const pts = line.trim().split(/\s+/);
        if (pts.length < 3) continue;
        const [h, m] = pts[0].split(':');
        const price = parseFloat(pts[1]) || 0;
        const cumVol = parseInt(pts[2]) || 0;
        const volume = cumVol - prevVol;
        prevVol = cumVol;
        allPoints.push({ time: `${day} ${h}:${m}`, price, volume: Math.max(0, volume) });
      }
    }
    return { data: allPoints, preClose };
  } catch { return { data: [], preClose: 0 }; }
}

async function fetchPeriodData(code: string, period: string, count: number = 120): Promise<DailyBar[]> {
  const qtCode = code.startsWith('6') ? `sh${code}` : `sz${code}`;
  const url = `https://web.ifzq.gtimg.cn/appstock/app/fqkline/get?param=${qtCode},${period},,,${count},qfq`;
  try {
    const resp = await fetch(url, { headers: { Referer: 'https://finance.qq.com', 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(10000) });
    if (!resp.ok) return [];
    const rawText = await resp.text();
    const json = JSON.parse(rawText);
    const qtData = json?.data?.[qtCode]?.qfqday;
    if (!qtData || !Array.isArray(qtData) || qtData.length === 0) return [];
    return qtData.map((item: any) => {
      const raw = Array.isArray(item) ? item : item.qfqday || [];
      const [date, open, close, high, low, volume] = raw;
      return {
        date: String(date),
        open: parseFloat(open) || 0,
        close: parseFloat(close) || 0,
        high: parseFloat(high) || 0,
        low: parseFloat(low) || 0,
        volume: parseInt(volume) || 0,
      };
    });
  } catch { return []; }
}

function getMinuteChartOptions(points: MinutePoint[], preClose: number) {
  const times = points.map(p => p.time);
  const prices = points.map(p => p.price);
  const lastPrice = prices[prices.length - 1] ?? preClose;
  const priceColor = lastPrice >= preClose ? '#ef4444' : '#22c55e';
  const areaTopColor = lastPrice >= preClose ? 'rgba(239,68,68,0.15)' : 'rgba(34,197,94,0.15)';
  const volumes = points.map(p => ({ value: p.volume, itemStyle: { color: p.price >= preClose ? 'rgba(239,68,68,0.5)' : 'rgba(34,197,94,0.5)' } }));
  return {
    tooltip: { trigger: 'axis', formatter: (params: any) => {
      const p = params[0];
      return `${p.axisValue}<br/><b style="color:${priceColor}">${p.value.toFixed(2)}</b>`;
    }},
    grid: [{ left: 50, right: 50, top: 20, height: '65%' }, { left: 50, right: 50, top: '75%', height: '15%' }],
    xAxis: [
      { type: 'category', data: times, boundaryGap: false, axisLine: { lineStyle: { color: '#334155' } }, axisLabel: { color: '#64748b', fontSize: 10 }, splitLine: { show: false } },
      { type: 'category', data: times, gridIndex: 1, boundaryGap: false, axisLine: { lineStyle: { color: '#334155' } }, axisLabel: { show: false } }
    ],
    yAxis: [
      { scale: true, gridIndex: 0, position: 'right', axisLine: { lineStyle: { color: '#334155' } }, axisLabel: { color: '#64748b', fontSize: 10 }, splitLine: { lineStyle: { color: '#1e293b' } }, splitNumber: 4 },
      { scale: true, gridIndex: 1, position: 'right', axisLine: { lineStyle: { color: '#334155' } }, axisLabel: { show: false }, splitLine: { show: false } }
    ],
    series: [
      { name: '价格', type: 'line', data: prices, xAxisIndex: 0, yAxisIndex: 0, smooth: true, symbol: 'none', lineStyle: { color: priceColor, width: 1.5 }, areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: areaTopColor }, { offset: 1, color: 'rgba(0,0,0,0)' }] } } },
      { name: '成交量', type: 'bar', data: volumes, xAxisIndex: 1, yAxisIndex: 1, barWidth: '80%' },
    ],
  };
}

function getCandlestickOptions(data: DailyBar[], totalAmount?: string) {
  const dates = data.map(d => d.date);
  const ohlc = data.map(d => [d.open, d.close, d.low, d.high]);
  const volumes = data.map(d => ({ value: d.volume, itemStyle: { color: d.close >= d.open ? '#ef4444' : '#22c55e' } }));
  return {
    tooltip: { trigger: 'axis', axisPointer: { type: 'cross' }, formatter: (params: any) => {
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
    }},
    grid: [{ left: 60, right: 20, top: 20, height: '58%' }, { left: 60, right: 20, top: '76%', height: '14%' }],
    xAxis: [
      { type: 'category', data: dates, gridIndex: 0, boundaryGap: true, axisLine: { lineStyle: { color: '#334155' } }, axisLabel: { color: '#64748b', fontSize: 10, formatter: (v: string) => v.slice(5) }, splitLine: { show: true, lineStyle: { color: '#1e293b' } } },
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
  const [minuteData, setMinuteData] = useState<MinutePoint[]>([]);
  const [dailyData, setDailyData] = useState<DailyBar[]>([]);
  const [loading, setLoading] = useState(true);
  const [minuteLoading, setMinuteLoading] = useState(false);
  const [dailyLoading, setDailyLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [activePeriod, setActivePeriod] = useState<PeriodType>('minute');
  const [showMore, setShowMore] = useState(false);
  const [periodData, setPeriodData] = useState<DailyBar[]>([]);
  const [periodLoading, setPeriodLoading] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setShowMore(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!code) return;
    setLoading(true);
    setQuote(null);
    setMinuteData([]);
    setDailyData([]);
    setPeriodData([]);
    setActivePeriod('minute');

    fetchStockQuote(code).then(q => {
      if (!q) { setNotFound(true); setLoading(false); return; }
      setQuote(q);
      setNotFound(false);

      setMinuteLoading(true);
      fetchMinuteData(code).then(mins => {
        setMinuteData(mins);
        setMinuteLoading(false);
      });

      setDailyLoading(true);
      fetch(`/api/stocks/${code}/daily?days=120`)
        .then(r => r.json())
        .then(d => { if (Array.isArray(d) && d.length > 0) setDailyData(d); })
        .catch(() => {})
        .finally(() => setDailyLoading(false));
    }).catch(() => { setNotFound(true); })
    .finally(() => setLoading(false));
  }, [code]);

  useEffect(() => {
    if (!quote || activePeriod === 'minute' || activePeriod === '5day') return;
    setPeriodLoading(true);
    const periodMap: Record<string, string> = {
      day: 'day', week: 'week', month: 'month', season: 'season', year: 'year',
      '1min': '1min', '5min': '5min', '15min': '15min', '30min': '30min', '60min': '60min'
    };
    const period = periodMap[activePeriod];
    if (!period) { setPeriodLoading(false); return; }
    const isMinute = MINUTE_PERIODS.includes(activePeriod);
    const isKLine = KLINE_PERIODS.includes(activePeriod);
    const count = isMinute ? 300 : isKLine ? 240 : 120;
    fetchPeriodData(code, period, count).then(data => {
      setPeriodData(data);
      setPeriodLoading(false);
    });
  }, [activePeriod, code, quote]);

  const handlePeriodChange = (period: PeriodType) => {
    setActivePeriod(period);
    setShowMore(false);
  };

  const getChartTitle = () => {
    const p = PERIODS.find(p => p.key === activePeriod);
    return p?.label || '';
  };

  const renderChart = () => {
    const preClose = quote ? parseFloat(quote.preClose) : 0;

    if (activePeriod === 'minute' || activePeriod === '5day') {
      if (minuteLoading) return <div className="h-[360px] flex items-center justify-center text-slate-500">加载中...</div>;
      if (minuteData.length === 0) return <div className="h-[360px] flex items-center justify-center text-slate-500">暂无分时数据</div>;
      return <ReactECharts option={getMinuteChartOptions(minuteData, preClose)} style={{ height: 360 }} />;
    }

    if (periodLoading) return <div className="h-[360px] flex items-center justify-center text-slate-500">加载中...</div>;
    if (periodData.length === 0) return <div className="h-[360px] flex items-center justify-center text-slate-500">暂无K线数据</div>;
    return <ReactECharts option={getCandlestickOptions(periodData, quote?.amount)} style={{ height: 360 }} />;
  };

  const up = quote ? parseFloat(quote.change) >= 0 : true;

  // 基本指标卡片
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
              <button onClick={() => { fetch('/api/stocks/user', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ stockCode: code }) }).then(() => alert('已添加自选')).catch(() => alert('添加失败')) }} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm transition-colors">
                + 加入自选
              </button>
            </div>
          </div>

          <div className="bg-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-slate-200">{getChartTitle()}</h2>
              <div className="flex items-center gap-1">
                {PERIODS.slice(0, 6).map(p => (
                  <button
                    key={p.key}
                    onClick={() => handlePeriodChange(p.key)}
                    className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                      activePeriod === p.key
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
                <div className="relative" ref={moreRef}>
                  <button
                    onClick={() => setShowMore(!showMore)}
                    className={`px-3 py-1.5 text-sm rounded-md transition-colors flex items-center gap-1 ${
                      PERIODS.slice(6).some(p => p.key === activePeriod)
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    更多 <span>▾</span>
                  </button>
                  {showMore && (
                    <div className="absolute right-0 top-full mt-1 bg-slate-700 rounded-md shadow-lg overflow-hidden z-10 min-w-[100px]">
                      {PERIODS.slice(6).map(p => (
                        <button
                          key={p.key}
                          onClick={() => handlePeriodChange(p.key)}
                          className={`block w-full text-left px-3 py-2 text-sm transition-colors ${
                            activePeriod === p.key
                              ? 'bg-blue-600 text-white'
                              : 'text-slate-300 hover:bg-slate-600'
                          }`}
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
