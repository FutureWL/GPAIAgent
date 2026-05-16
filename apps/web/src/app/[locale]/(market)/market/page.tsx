'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';

type StockItem = {
  code: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume?: number;
};

// 主要股票池（覆盖沪深主板、创业板、科创板）
const MAJOR_STOCKS = [
  // 沪市
  'sh600519','sh600036','sh601318','sh600887','sh601888','sh600030','sh601857',
  'sh600276','sh600585','sh600690','sh600809','sh601012','sh600309','sh600887',
  'sh601328','sh601166','sh600000','sh601398','sh601288','sh600016','sh600050',
  'sh600048','sh601088','sh601668','sh601186','sh601601','sh600028','sh601899',
  'sh603259','sh688981','sh688599','sh601985','sh601816','sh600837','sh600999',
  'sh600900','sh600438','sh601225','sh600893','sh601633','sh600760','sh601169',
  'sh600029','sh601991','sh601818','sh600745','sh603799','sh600132','sh600115',
  'sh600170','sh600276','sh603288','sh600183','sh601888','sh600588',
  // 深市
  'sz000858','sz000333','sz002594','sz000001','sz000002','sz000651','sz000876',
  'sz002415','sz002475','sz002714','sz000568','sz000725','sz000063','sz002230',
  'sz002371','sz002460','sz002466','sz002497','sz002648','sz300750','sz300015',
  'sz300059','sz300122','sz300124','sz300274','sz300760','sz300896','sz300999',
  'sz301536','sz301587','sz000983','sz002352','sz300033','sz300408','sz300782',
  'sz300014','sz300450','sz300012','sz300346','sz300529','sz300015','sz300760',
  // 指数
  'sh000001','sz399001','sz399006',
];

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
      // 通过后端代理调用腾讯行情接口（避免CORS）
      const codes = MAJOR_STOCKS.join(',');
      const res = await fetch(`/api/stocks/quotes?codes=${codes}`, {
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) throw new Error('接口失败');
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        setAllStocks(data);
      } else {
        throw new Error('空数据');
      }
    } catch {
      // fallback：静态假数据
      setAllStocks([
        { code: '600519', name: '贵州茅台', price: 1688, change: 20.5, changePercent: 1.23 },
        { code: '000858', name: '五粮液', price: 142.3, change: -1.8, changePercent: -1.25 },
        { code: '601318', name: '中国平安', price: 45.6, change: 0.85, changePercent: 1.90 },
        { code: '000001', name: '平安银行', price: 11.25, change: 0.15, changePercent: 1.35 },
      ]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMarket();
  }, [fetchMarket]);

  useEffect(() => {
    if (!search.trim()) {
      setDisplayedStocks(allStocks.slice(0, 100));
    } else {
      const q = search.toUpperCase();
      setDisplayedStocks(
        allStocks.filter(
          (s) => s.code.includes(q) || s.name.includes(search)
        ).slice(0, 50)
      );
    }
  }, [search, allStocks]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">行情</h1>
        <p className="text-sm text-slate-400 mt-1">A股主要股票实时行情</p>
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
            {loading ? '加载中...' : `共 ${displayedStocks.length} 只股票`}
          </span>
          <span className="text-xs text-green-400">● 实时</span>
        </div>
        {loading && allStocks.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">正在获取行情数据...</div>
        ) : displayedStocks.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">暂无数据</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-slate-400 text-xs border-b border-slate-700">
                  <th className="text-left px-4 py-2 font-normal">代码</th>
                  <th className="text-left px-4 py-2 font-normal">名称</th>
                  <th className="text-right px-4 py-2 font-normal">现价</th>
                  <th className="text-right px-4 py-2 font-normal">涨跌额</th>
                  <th className="text-right px-4 py-2 font-normal">涨跌幅</th>
                  <th className="text-right px-4 py-2 font-normal">成交量</th>
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
                      <td className="px-4 py-2.5 text-slate-400">{s.code}</td>
                      <td className="px-4 py-2.5 font-medium">{s.name}</td>
                      <td className="px-4 py-2.5 text-right">{s.price > 0 ? s.price.toFixed(2) : '-'}</td>
                      <td className={`px-4 py-2.5 text-right ${up ? 'text-red-400' : 'text-green-400'}`}>
                        {s.change > 0 ? '+' : ''}{s.change.toFixed(2)}
                      </td>
                      <td className={`px-4 py-2.5 text-right ${up ? 'text-red-400' : 'text-green-400'}`}>
                        {up ? '+' : ''}{s.changePercent.toFixed(2)}%
                      </td>
                      <td className="px-4 py-2.5 text-right text-slate-400">
                        {s.volume ? (s.volume / 10000).toFixed(0) + '万' : '-'}
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
