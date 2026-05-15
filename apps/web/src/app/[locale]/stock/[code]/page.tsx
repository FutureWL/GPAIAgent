'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';

interface Quote {
  code: string;
  name: string;
  price: string;
  change: string;
  changePercent: string;
  open: string;
  high: string;
  low: string;
  preClose: string;
  volume: string;
  amount: string;
  date: string;
  time: string;
}

interface MinutePoint {
  time: string;
  price: number;
  volume: number;
  amount: number;
}

function toTencentCode(code: string): string {
  if (code.startsWith('sh') || code.startsWith('sz')) return code;
  return code.startsWith('6') ? `sh${code}` : `sz${code}`;
}

// 从腾讯接口获取单只股票详情
async function fetchStockQuote(code: string): Promise<Quote | null> {
  const qtCode = toTencentCode(code);
  const url = `https://qt.gtimg.cn/q=${qtCode}`;
  try {
    const resp = await fetch(url, {
      headers: { Referer: 'https://finance.qq.com', 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(10000),
    });
    if (!resp.ok) return null;
    const text = await resp.text();
    const line = text.trim().split('\n')[0];
    const parts = line.split('~');
    if (!parts[1] || parts[1] === '') return null;

    const price = parseFloat(parts[3]) || 0;
    const prevClose = parseFloat(parts[4]) || 0;
    const open = parseFloat(parts[5]) || 0;
    const volume = parseFloat(parts[6]) || 0;
    const high = parseFloat(parts[33]) || 0;
    const low = parseFloat(parts[34]) || 0;
    const amount = parseFloat(parts[37]) || 0;
    const date = parts[30] || '';
    const time = parts[31] || '';
    const change = price - prevClose;
    const changePercent = prevClose ? (change / prevClose * 100) : 0;

    const rawName = parts[40] || parts[1] || '';
    const NAME_MAP: Record<string, string> = {
      '000001': '上证指数', '399001': '深证成指', '399006': '创业板指',
      '600519': '贵州茅台', '000858': '五粮液', '601318': '中国平安',
      '600036': '招商银行', '601888': '中国中免',
    };
    const numPart = qtCode.replace(/^(sh|sz)/i, '');
    const isReadable = (s: string) => /^[\u4e00-\u9fa5a-zA-Z0-9（）()、。]+$/.test(s) && s.length <= 12;
    const name = isReadable(rawName) ? rawName : (NAME_MAP[numPart] || numPart);

    return {
      code: qtCode,
      name,
      price: price.toFixed(2),
      change: change.toFixed(2),
      changePercent: changePercent.toFixed(2),
      open: open.toFixed(2),
      high: high.toFixed(2),
      low: low.toFixed(2),
      preClose: prevClose.toFixed(2),
      volume: (volume / 100).toFixed(0) + ' 万股',
      amount: (amount / 100000000).toFixed(2) + ' 亿',
      date,
      time,
    };
  } catch { return null; }
}

// 从腾讯分时接口获取分时数据
async function fetchMinuteData(code: string): Promise<MinutePoint[]> {
  const qtCode = toTencentCode(code);
  const url = `https://web.ifzq.gtimg.cn/appstock/app/minute/query?code=${qtCode}`;
  try {
    const resp = await fetch(url, {
      headers: { Referer: 'https://finance.qq.com', 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(10000),
    });
    if (!resp.ok) return [];
    const json = await resp.json();
    const raw = json?.data?.[qtCode]?.data?.data;
    if (!Array.isArray(raw)) return [];
    return raw.map((line: string) => {
      const parts = line.trim().split(/\s+/);
      const [h, m] = parts[0].split(':').map(Number);
      return {
        time: parts[0],
        price: parseFloat(parts[1]) || 0,
        volume: parseInt(parts[2]) || 0,
        amount: parseFloat(parts[3]) || 0,
      };
    });
  } catch { return []; }
}

// 分时图 ECharts 组件（动态导入避免 SSR 问题）
function MinuteChart({ data, preClose, up }: { data: MinutePoint[]; preClose: number; up: boolean }) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<any>(null);

  useEffect(() => {
    if (!data.length || !chartRef.current) return;

    let echarts: any;
    import('echarts').then((mod) => {
      echarts = mod;
      if (!chartRef.current) return;

      if (chartInstanceRef.current) {
        chartInstanceRef.current.dispose();
      }
      const chart = echarts.init(chartRef.current, 'dark');
      chartInstanceRef.current = chart;

      const times = data.map((d) => d.time);
      const prices = data.map((d) => d.price);
      const avgPrices = data.map((d) => d.price); // 简化：价格即均线

      // 成交量柱状
      const volumes = data.map((d) => d.volume);

      const option = {
        backgroundColor: 'transparent',
        animation: false,
        grid: [
          { x: '0%', y: '0%', width: '100%', height: '65%' },
          { x: '0%', y: '70%', width: '100%', height: '25%' },
        ],
        xAxis: [
          {
            type: 'category', data: times, gridIndex: 0,
            boundaryGap: false, axisLine: { lineStyle: { color: '#334155' } },
            axisTick: { show: false }, axisLabel: { show: false },
            splitLine: { show: true, lineStyle: { color: '#1e293b', type: 'dashed' } },
          },
          {
            type: 'category', data: times, gridIndex: 1,
            boundaryGap: false, axisLine: { lineStyle: { color: '#334155' } },
            axisTick: { show: false }, axisLabel: { color: '#64748b', fontSize: 10 },
            splitLine: { show: false },
          },
        ],
        yAxis: [
          {
            scale: true, gridIndex: 0,
            splitNumber: 4,
            axisLine: { show: false },
            axisTick: { show: false },
            axisLabel: { color: '#64748b', fontSize: 10 },
            splitLine: { lineStyle: { color: '#1e293b', type: 'dashed' } },
            position: 'right',
          },
          {
            scale: true, gridIndex: 1,
            splitNumber: 2, show: false,
          },
        ],
        series: [
          {
            name: '价格',
            type: 'line', data: prices, xAxisIndex: 0, yAxisIndex: 0,
            smooth: false, symbol: 'none',
            lineStyle: { width: 1.5, color: up ? '#ef4444' : '#22c55e' },
            areaStyle: {
              color: {
                type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
                colorStops: [
                  { offset: 0, color: up ? 'rgba(239,68,68,0.25)' : 'rgba(34,197,94,0.25)' },
                  { offset: 1, color: 'rgba(0,0,0,0)' },
                ],
              },
            },
            markLine: {
              silent: true,
              symbol: 'none',
              lineStyle: { color: '#64748b', type: 'dashed', width: 1 },
              data: [{ yAxis: preClose }],
              label: { show: false },
            },
          },
          {
            name: '成交量',
            type: 'bar', xAxisIndex: 1, yAxisIndex: 1,
            data: volumes,
            barWidth: '60%',
            itemStyle: { color: (params: any) => {
              const p = prices[params.dataIndex];
              return p >= preClose ? 'rgba(239,68,68,0.5)' : 'rgba(34,197,94,0.5)';
            }},
          },
        ],
      };

      chart.setOption(option);
    });

    const handleResize = () => chartInstanceRef.current?.resize();
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      chartInstanceRef.current?.dispose();
    };
  }, [data, preClose, up]);

  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-700 flex items-center justify-between">
        <h2 className="text-sm font-medium text-white">分时图</h2>
        <span className="text-xs text-slate-500">点击查看大图</span>
      </div>
      <div ref={chartRef} className="w-full" style={{ height: '320px' }} />
    </div>
  );
}

export default function StockDetailPage() {
  const params = useParams();
  const router = useRouter();
  const code = params.code as string;

  const [quote, setQuote] = useState<Quote | null>(null);
  const [minuteData, setMinuteData] = useState<MinutePoint[]>([]);
  const [minuteLoading, setMinuteLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const loadQuote = async () => {
    setLoading(true);
    const q = await fetchStockQuote(code);
    if (q === null) {
      setNotFound(true);
    } else {
      setQuote(q);
      setNotFound(false);
      // 加载分时数据
      setMinuteLoading(true);
      const mins = await fetchMinuteData(code);
      setMinuteData(mins);
      setMinuteLoading(false);
    }
    setLoading(false);
  };

  useEffect(() => { if (code) loadQuote(); }, [code]);

  const up = quote ? parseFloat(quote.change) >= 0 : true;

  return (
    <div className="space-y-4">
      {/* 返回按钮 */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1 text-sm text-slate-400 hover:text-white transition-colors"
      >
        <span>←</span><span>返回行情</span>
      </button>

      {/* 加载状态 */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="animate-pulse text-slate-400">加载中...</div>
        </div>
      )}

      {/* 未找到 */}
      {notFound && !loading && (
        <div className="text-center py-20">
          <div className="text-slate-400 mb-4">未找到股票 {code}</div>
          <button
            onClick={() => router.push('/zh/market')}
            className="bg-slate-700 hover:bg-slate-600 text-white rounded-lg px-4 py-2 text-sm"
          >
            返回行情列表
          </button>
        </div>
      )}

      {/* 股票详情 */}
      {quote && !loading && (
        <>
          {/* 头部：名称 + 代码 + 价格 */}
          <div className="bg-slate-800/70 border border-slate-700 rounded-xl p-6">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-bold text-white">{quote.name}</h1>
                <p className="text-sm text-slate-400 mt-1">{quote.code.toUpperCase()}</p>
                <p className="text-xs text-slate-500 mt-0.5">{quote.date} {quote.time} 更新</p>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-white">{quote.price}</div>
                <div className={`text-lg font-medium mt-1 ${up ? 'text-red-400' : 'text-green-400'}`}>
                  {up ? '+' : ''}{quote.change} ({up ? '+' : ''}{quote.changePercent}%)
                </div>
              </div>
            </div>
            <div className="mt-4 h-1.5 bg-slate-700 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${up ? 'bg-red-500' : 'bg-green-500'}`}
                style={{ width: '50%' }}
              />
            </div>
          </div>

          {/* 分时图 */}
          {minuteLoading ? (
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-700">
                <h2 className="text-sm font-medium text-white">分时图</h2>
              </div>
              <div className="flex items-center justify-center" style={{ height: '320px' }}>
                <div className="animate-pulse text-slate-400 text-sm">加载分时数据...</div>
              </div>
            </div>
          ) : minuteData.length > 0 ? (
            <MinuteChart data={minuteData} preClose={parseFloat(quote.preClose)} up={up} />
          ) : (
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-700">
                <h2 className="text-sm font-medium text-white">分时图</h2>
              </div>
              <div className="flex items-center justify-center" style={{ height: '320px' }}>
                <div className="text-slate-500 text-sm">分时数据暂不可用</div>
              </div>
            </div>
          )}

          {/* 关键指标 */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: '今开', value: quote.open },
              { label: '昨收', value: quote.preClose },
              { label: '最高', value: quote.high },
              { label: '最低', value: quote.low },
              { label: '成交量', value: quote.volume },
              { label: '成交额', value: quote.amount },
            ].map((item) => (
              <div key={item.label} className="bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3">
                <div className="text-xs text-slate-400 mb-1">{item.label}</div>
                <div className="text-lg font-mono font-medium text-white">{item.value}</div>
              </div>
            ))}
          </div>

          {/* 操作按钮 */}
          <div className="flex gap-3">
            <button className="flex-1 bg-blue-600 hover:bg-blue-500 text-white rounded-xl py-3 text-sm font-medium transition-colors">
              + 加入自选
            </button>
            <button className="flex-1 bg-slate-700 hover:bg-slate-600 text-white rounded-xl py-3 text-sm font-medium transition-colors">
              查看策略
            </button>
          </div>

          {/* 行情表格 */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-700">
              <h2 className="text-sm font-medium text-white">实时行情</h2>
            </div>
            <div className="p-4 space-y-3">
              {[
                { label: '现价', value: quote.price, color: up },
                { label: '涨跌额', value: `${up ? '+' : ''}${quote.change}`, color: up },
                { label: '涨跌幅', value: `${up ? '+' : ''}${quote.changePercent}%`, color: up },
                { label: '今开', value: quote.open },
                { label: '昨收', value: quote.preClose },
                { label: '最高', value: quote.high, color: true },
                { label: '最低', value: quote.low, color: false },
                { label: '成交量', value: quote.volume },
                { label: '成交额', value: quote.amount },
                { label: '更新时间', value: `${quote.date} ${quote.time}` },
              ].map((item) => (
                <div key={item.label} className="flex justify-between text-sm">
                  <span className="text-slate-400">{item.label}</span>
                  <span className={`font-mono ${item.color === true ? 'text-red-400' : item.color === false ? 'text-green-400' : 'text-white'}`}>
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
