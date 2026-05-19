'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { fmtCap, fmtAmount } from '@/lib/stock-utils';

type StockItem = {
  code: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume?: number;       // 手
  amount?: number;       // 万元
  turnover?: number;      // %
  circulateCap?: number;  // 亿元
  totalCap?: number;      // 亿元
  netInflow?: number;     // 万元
  isIndex?: boolean;
};

// A股指数
const INDEX_CODES = [
  'sh000001','sz399001','sz399006','sz399005',
  'sh000300','sh000016','sh000688','sz399901',
  'sz399106','sh000905','sh000852','sz399303',
  'sz399606','sh000015','sh000689','sz399550',
  'sh000978','sz399328','sh000888','sh000001',
];

// 主要股票池
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

    // 指数: parts[1] 为空或 undefined
    const isIndex = !parts[1] || parts[1] === parts[2];
    const code = parts[2] || '';
    const name = isIndex ? (parts[40] || parts[1] || code) : (parts[1] || code);
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
      code,
      name: name.replace(/["\s]/g, ''),
      price,
      change,
      changePercent,
      volume,
      amount,
      turnover,
      circulateCap,
      totalCap,
      netInflow,
      isIndex,
    };
  } catch {
    return null;
  }
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

      // 按成交量降序排
      merged.sort((a, b) => (b.volume || 0) - (a.volume || 0));

      // 去除重复
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
      setDisplayedStocks(allStocks.slice(0, 100));
    } else {
      const q = search.toUpperCase();
      setDisplayedStocks(
        allStocks.filter((s) => s.code.includes(q) || s.name.includes(search)).slice(0, 100)
      );
    }
  }, [search, allStocks]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">行情</h1>
        <p className="text-sm text-slate-400 mt-1">A股市场实时行情 · 共 {allStocks.length} 只</p>
      </div>

      <div className="flex gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="搜索股票代码或名称..."
          className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-slate-500"
        />
        <button
          onClick={fetchMarket}
          className="bg-slate-700 hover:bg-slate-600 text-white rounded-lg px-4 py-2.5 text-sm"
        >
          刷新
        </button>
      </div>

      <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
        <div className="px-4 py-2 border-b border-slate-700 flex items-center justify-between">
          <span className="text-xs text-slate-400">
            {loading ? '加载中...' : `共 ${displayedStocks.length} 只`}
          </span>
          <span className="text-xs text-green-400">● 实时</span>
        </div>
        {loading && allStocks.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">正在获取行情数据...</div>
        ) : displayedStocks.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">暂无数据</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-slate-400 border-b border-slate-700">
                  <th className="text-left px-3 py-2 font-normal">代码</th>
                  <th className="text-left px-3 py-2 font-normal">名称</th>
                  <th className="text-right px-3 py-2 font-normal">现价</th>
                  <th className="text-right px-3 py-2 font-normal">涨跌</th>
                  <th className="text-right px-3 py-2 font-normal">涨跌幅</th>
                  <th className="text-right px-3 py-2 font-normal">成交额</th>
                  <th className="text-right px-3 py-2 font-normal">换手率</th>
                  <th className="text-right px-3 py-2 font-normal">流通市值</th>
                  <th className="text-right px-3 py-2 font-normal">总市值</th>
                  <th className="text-right px-3 py-2 font-normal">净流入</th>
                </tr>
              </thead>
              <tbody>
                {displayedStocks.map((s) => {
                  const up = s.change >= 0;
                  return (
                    <tr
                      key={s.code}
                      className="border-b border-slate-800 hover:bg-slate-700/30 cursor-pointer"
                      onClick={() => router.push(`/${locale}/stock/${s.code}`)}
                    >
                      <td className="px-3 py-2 text-slate-400">{s.code}</td>
                      <td className="px-3 py-2 font-medium">{s.name}</td>
                      <td className="px-3 py-2 text-right">{s.price > 0 ? s.price.toFixed(2) : '-'}</td>
                      <td className={`px-3 py-2 text-right ${up ? 'text-red-400' : 'text-green-400'}`}>
                        {up ? '+' : ''}{s.change.toFixed(2)}
                      </td>
                      <td className={`px-3 py-2 text-right ${up ? 'text-red-400' : 'text-green-400'}`}>
                        {up ? '+' : ''}{s.changePercent.toFixed(2)}%
                      </td>
                      <td className="px-3 py-2 text-right text-slate-300">
                        {s.amount ? fmtAmount(s.amount) : '-'}
                      </td>
                      <td className="px-3 py-2 text-right text-slate-300">
                        {s.turnover ? s.turnover.toFixed(2) + '%' : '-'}
                      </td>
                      <td className="px-3 py-2 text-right text-slate-300">
                        {s.circulateCap ? fmtCap(s.circulateCap) : '-'}
                      </td>
                      <td className="px-3 py-2 text-right text-slate-300">
                        {s.totalCap ? fmtCap(s.totalCap) : '-'}
                      </td>
                      <td className={`px-3 py-2 text-right ${up ? 'text-red-400' : 'text-green-400'}`}>
                        {s.netInflow ? (up ? '+' : '-') + fmtAmount(Math.abs(s.netInflow)) : '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
