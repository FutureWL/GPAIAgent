'use client';

import { useEffect, useState } from 'react';
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

function toTencentCode(code: string): string {
  if (code.startsWith('sh') || code.startsWith('sz')) {
    return code;
  }
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

    // 名称：上证指数/深证成指 等指数用 parts[40]，股票用 parts[1]
    // 腾讯返回 GBK 编码，中文会乱码，用预设名称映射
    const rawName = parts[40] || parts[1] || '';
    const NAME_MAP: Record<string, string> = {
      '000001': '上证指数', '399001': '深证成指', '399006': '创业板指',
      '600519': '贵州茅台', '000858': '五粮液', '601318': '中国平安',
      '600036': '招商银行', '601888': '中国中免',
    };
    const numPart = qtCode.replace(/^(sh|sz)/i, '');
    // 只有纯中文或英文字符才用 rawName，否则查映射表
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
  } catch {
    return null;
  }
}

export default function StockDetailPage() {
  const params = useParams();
  const router = useRouter();
  const code = params.code as string;

  const [quote, setQuote] = useState<Quote | null>(null);
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
    }
    setLoading(false);
  };

  useEffect(() => {
    if (code) loadQuote();
  }, [code]);

  const up = quote ? parseFloat(quote.change) >= 0 : true;

  return (
    <div className="space-y-4">
      {/* 返回按钮 */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1 text-sm text-slate-400 hover:text-white transition-colors"
      >
        <span>←</span>
        <span>返回行情</span>
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
                <p className="text-xs text-slate-500 mt-0.5">
                  {quote.date} {quote.time} 更新
                </p>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-white">{quote.price}</div>
                <div className={`text-lg font-medium mt-1 ${up ? 'text-red-400' : 'text-green-400'}`}>
                  {up ? '+' : ''}{quote.change} ({up ? '+' : ''}{quote.changePercent}%)
                </div>
              </div>
            </div>

            {/* 涨跌指示条 */}
            <div className="mt-4 h-1.5 bg-slate-700 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${up ? 'bg-red-500' : 'bg-green-500'}`}
                style={{ width: '50%' }}
              />
            </div>
          </div>

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
              <div
                key={item.label}
                className="bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3"
              >
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
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">现价</span>
                <span className={`font-mono font-medium ${up ? 'text-red-400' : 'text-green-400'}`}>
                  {quote.price}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">涨跌额</span>
                <span className={`font-mono ${up ? 'text-red-400' : 'text-green-400'}`}>
                  {up ? '+' : ''}{quote.change}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">涨跌幅</span>
                <span className={`font-mono ${up ? 'text-red-400' : 'text-green-400'}`}>
                  {up ? '+' : ''}{quote.changePercent}%
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">今开</span>
                <span className="font-mono text-white">{quote.open}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">昨收</span>
                <span className="font-mono text-white">{quote.preClose}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">最高</span>
                <span className="font-mono text-red-400">{quote.high}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">最低</span>
                <span className="font-mono text-green-400">{quote.low}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">成交量</span>
                <span className="font-mono text-white">{quote.volume}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">成交额</span>
                <span className="font-mono text-white">{quote.amount}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">更新时间</span>
                <span className="font-mono text-slate-400">{quote.date} {quote.time}</span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
