'use client';

import { useEffect, useState } from 'react';
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
}

interface MinutePoint { time: string; price: number; volume: number; }

interface DailyBar { date: string; open: number; close: number; high: number; low: number; volume: number; }

const NAME_MAP: Record<string, string> = {
  '000001': '上证指数', '399001': '深证成指', '399006': '创业板指',
  '600519': '贵州茅台', '000858': '五粮液', '600036': '招商银行',
  '601318': '中国平安', '000333': '美的集团', '002594': '比亚迪',
  '600887': '伊利股份', '600030': '中信证券',
  '601888': '中国中免', '300750': '宁德时代', '688981': '中芯国际',
};

async function fetchStockQuote(code: string): Promise<Quote | null> {
  const url = `https://qt.gtimg.cn/q=${code.startsWith('sh') || code.startsWith('sz') ? code : (code.startsWith('6') ? 'sh' : 'sz') + code}`;
  try {
    const resp = await fetch(url, { headers: { Referer: 'https://finance.qq.com', 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(8000) });
    if (!resp.ok) return null;
    const text = await resp.text();
    const eq = text.indexOf('=');
    if (eq < 0) return null;
    const parts = text.substring(eq + 2).split('~');
    if (parts.length < 40) return null;
    const rawName = parts[1];
    const name = NAME_MAP[code.replace(/^(sh|sz)/, '')] || rawName.replace(/["\s]/g, '');
    const price = parseFloat(parts[3]) || 0;
    const preClose = parseFloat(parts[4]) || 0;
    const change = parseFloat(parts[31]) || 0;
    const changePercent = parseFloat(parts[32]) || 0;
    return {
      code: parts[2],
      name,
      price: price.toFixed(2),
      change: change.toFixed(2),
      changePercent: changePercent.toFixed(2),
      open: parseFloat(parts[5]).toFixed(2),
      preClose: preClose.toFixed(2),
      high: parseFloat(parts[34]).toFixed(2),
      low: parseFloat(parts[35]).toFixed(2),
      volume: ((parseInt(parts[6]) || 0) / 100).toFixed(2),
      amount: ((parseFloat(parts[36]) || 0) / 100000000).toFixed(2),
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
      const parts = line.trim().split(/\s+/);
      if (parts.length < 3) continue;
      const [h, m] = parts[0].split(':');
      const time = `${h}:${m}`;
      const price = parseFloat(parts[1]) || 0;
      const cumVol = parseInt(parts[2]) || 0;
      const volume = cumVol - prevVol;
      prevVol = cumVol;
      points.push({ time, price, volume: Math.max(0, volume) });
    }
    return points;
  } catch { return []; }
}

function getMinuteChartOptions(points: MinutePoint[], preClose: number) {
  const times = points.map(p => p.time);
  const prices = points.map(p => p.price);
  const volumes = points.map(p => ({ value: p.volume, itemStyle: { color: p.price >= preClose ? 'rgba(239,68,68,0.5)' : 'rgba(34,197,94,0.5)' } }));
  return {
    tooltip: { trigger: 'axis', formatter: (params: any) => {
      const p = params[0];
      return `${p.axisValue}<br/><b>${p.value.toFixed(2)}</b>`;
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
      { name: '价格', type: 'line', data: prices, xAxisIndex: 0, yAxisIndex: 0, smooth: true, symbol: 'none', lineStyle: { color: prices[prices.length - 1] >= preClose ? '#ef4444' : '#22c55e', width: 1.5 }, areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: prices[prices.length - 1] >= preClose ? 'rgba(239,68,68,0.15)' : 'rgba(34,197,94,0.15)' }, { offset: 1, color: 'rgba(0,0,0,0)' }] } } },
      { name: '成交量', type: 'bar', data: volumes, xAxisIndex: 1, yAxisIndex: 1, barWidth: '80%' },
    ],
    graphic: [{ type: 'line', shape: { x1: 0, y1: 0, x2: 0, y2: '100%' }, invisible: true, z: 0 }],
  };
}

function getCandlestickOptions(data: DailyBar[]) {
  const dates = data.map(d => d.date);
  const ohlc = data.map(d => [d.open, d.close, d.low, d.high]);
  const volumes = data.map(d => ({ value: d.volume, itemStyle: { color: d.close >= d.open ? '#ef4444' : '#22c55e' } }));

  return {
    tooltip: { trigger: 'axis', axisPointer: { type: 'cross' }, formatter: (params: any) => {
      const idx = params[0].dataIndex;
      const d = data[idx];
      if (!d) return '';
      const color = d.close >= d.open ? '#ef4444' : '#22c55e';
      return `<b style="color:${color}">${d.date}</b><br/>
        开：${d.open.toFixed(2)}<br/>
        收：${d.close.toFixed(2)}<br/>
        高：${d.high.toFixed(2)}<br/>
        低：${d.low.toFixed(2)}<br/>
        量：${(d.volume / 10000).toFixed(2)}万手`;
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

  useEffect(() => {
    if (!code) return;
    setLoading(true);
    setQuote(null);
    setMinuteData([]);
    setDailyData([]);

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

  const up = quote ? parseFloat(quote.change) >= 0 : true;

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
                  {up ? '+' : ''}{quote.change} ({quote.changePercent}%)
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mt-5">
              {[
                ['今开', quote.open], ['昨收', quote.preClose],
                ['最高', quote.high], ['最低', quote.low],
                ['成交量', quote.volume + '手'], ['成交额', quote.amount + '亿'],
              ].map(([label, val]) => (
                <div key={label} className="bg-slate-700/40 rounded-lg px-3 py-2">
                  <div className="text-slate-400 text-xs">{label}</div>
                  <div className="text-white font-medium mt-0.5">{val}</div>
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
            <h2 className="text-lg font-semibold text-slate-200 mb-3">分时图</h2>
            {minuteLoading ? (
              <div className="h-[320px] flex items-center justify-center text-slate-500">加载中...</div>
            ) : minuteData.length > 0 ? (
              <ReactECharts option={getMinuteChartOptions(minuteData, parseFloat(quote.preClose))} style={{ height: 320 }} />
            ) : (
              <div className="h-[320px] flex items-center justify-center text-slate-500">暂无分时数据</div>
            )}
          </div>

          <div className="bg-slate-800 rounded-xl p-4">
            <h2 className="text-lg font-semibold text-slate-200 mb-3">
              日K线（近{dailyData.length > 0 ? dailyData.length : ''}日）
            </h2>
            {dailyLoading ? (
              <div className="h-[320px] flex items-center justify-center text-slate-500">加载K线数据...</div>
            ) : dailyData.length > 0 ? (
              <ReactECharts option={getCandlestickOptions(dailyData)} style={{ height: 320 }} />
            ) : (
              <div className="h-[320px] flex items-center justify-center text-slate-500">暂无K线数据（请先运行数据同步脚本）</div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
