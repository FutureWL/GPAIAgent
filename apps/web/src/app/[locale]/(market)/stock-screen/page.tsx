'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Sparkles, Filter, Loader2, AlertCircle } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { fmtCap, fmtAmount } from '@/lib/stock-utils';

type StockQuote = {
  code: string;
  name: string;
  market: string;
  latestPrice?: number;
  priceChange?: number;
  priceChangePct?: number;
  volume?: number;
  turnoverRate?: number;
  marketCap?: number;
  netInflow?: number;
  amount?: number;
};

type ScreenResult = {
  result?: string;
  riskLevel?: string;
  riskLabel?: string;
};

export default function StockScreenPage() {
  const router = useRouter();
  const pathname = usePathname();
  const locale = pathname.split('/')[1] || 'zh';

  const [tab, setTab] = useState<'criteria' | 'ai'>('criteria');
  const [priceChangeMin, setPriceChangeMin] = useState('');
  const [priceChangeMax, setPriceChangeMax] = useState('');
  const [turnoverRateMin, setTurnoverRateMin] = useState('');
  const [volumeMin, setVolumeMin] = useState('');
  const [marketCapMin, setMarketCapMin] = useState('');
  const [market, setMarket] = useState<string>('all');
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<string | null>(null);
  const [aiRiskLabel, setAiRiskLabel] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [results, setResults] = useState<StockQuote[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [history, setHistory] = useState<unknown[]>([]);
  const [loginTip, setLoginTip] = useState(false);

  const loadHistory = useCallback(async () => {
    try {
      const data = await apiFetch<unknown[]>('/api/stock-screen/history');
      setHistory(Array.isArray(data) ? data : []);
    } catch { setHistory([]); }
  }, []);

  useEffect(() => {
    if (tab === 'criteria') loadHistory();
  }, [tab, loadHistory]);

  async function handleScreen() {
    setLoading(true);
    setSearched(true);
    setResults([]);
    setAiResult(null);
    try {
      const criteria: Record<string, unknown> = {};
      if (priceChangeMin) criteria.priceChangeMin = parseFloat(priceChangeMin);
      if (priceChangeMax) criteria.priceChangeMax = parseFloat(priceChangeMax);
      if (turnoverRateMin) criteria.turnoverRateMin = parseFloat(turnoverRateMin);
      if (volumeMin) criteria.volumeMin = parseFloat(volumeMin);
      if (marketCapMin) criteria.marketCapMin = parseFloat(marketCapMin);
      if (market !== 'all') criteria.market = market;
      const data = await apiFetch<StockQuote[]>('/api/stock-screen/screen', {
        method: 'POST',
        body: JSON.stringify({ title: '条件选股', criteria }),
      });
      setResults(Array.isArray(data) ? data : []);
    } catch { setResults([]); }
    finally { setLoading(false); }
  }

  async function handleAiScreen() {
    if (!aiPrompt.trim()) return;
    setAiLoading(true);
    setAiError(null);
    setAiResult(null);
    setResults([]);
    setSearched(true);
    try {
      const data = await apiFetch<ScreenResult>('/api/stock-screen/ai', {
        method: 'POST',
        body: JSON.stringify({ description: aiPrompt }),
      });
      setAiResult(data.result ?? null);
      setAiRiskLabel(data.riskLabel ?? null);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes('401') || msg.includes('Unauthorized') || msg.includes('jwt')) {
        setLoginTip(true);
        setAiError('请先登录后再使用 AI 选股功能');
      } else if (msg.includes('会员')) {
        setAiError(msg);
      } else {
        setAiError('AI 选股服务暂时不可用，请稍后重试');
      }
    } finally { setAiLoading(false); }
  }

  async function handleSave() {
    if (!results.length) return;
    try {
      await apiFetch('/api/stock-screen/save', {
        method: 'POST',
        body: JSON.stringify({ title: tab === 'ai' ? 'AI 选股' : '条件选股', criteria: {} }),
      });
      loadHistory();
    } catch { /* ignore */ }
  }

  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      <div>
        <h1 className="text-xl font-bold">AI 选股</h1>
        <p className="text-sm text-slate-400 mt-1">基于条件筛选或 AI 智能匹配，找到符合条件的股票</p>
      </div>
      <div className="flex gap-1 bg-slate-800/50 p-1 rounded-lg w-fit">
        <button onClick={() => { setTab('criteria'); setSearched(false); setResults([]); setAiResult(null); }}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors ${tab === 'criteria' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}>
          <Filter size={15} />条件选股
        </button>
        <button onClick={() => { setTab('ai'); setSearched(false); setResults([]); setAiResult(null); }}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors ${tab === 'ai' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}>
          <Sparkles size={15} />AI 选股<span className="bg-purple-500 text-white text-[10px] px-1.5 py-0.5 rounded">会员</span>
        </button>
      </div>
      {tab === 'criteria' ? (
        <>
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
            <div className="text-sm font-medium mb-3">筛选条件</div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">市场</label>
                <select value={market} onChange={(e) => setMarket(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-slate-500">
                  <option value="all">全部</option><option value="sh">上海</option><option value="sz">深圳</option><option value="bj">北京</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">最小涨跌幅 (%)</label>
                <input type="number" value={priceChangeMin} onChange={(e) => setPriceChangeMin(e.target.value)} placeholder="如 3"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-slate-500" />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">最大涨跌幅 (%)</label>
                <input type="number" value={priceChangeMax} onChange={(e) => setPriceChangeMax(e.target.value)} placeholder="如 10"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-slate-500" />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">最小换手率 (%)</label>
                <input type="number" value={turnoverRateMin} onChange={(e) => setTurnoverRateMin(e.target.value)} placeholder="如 5"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-slate-500" />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">最小成交量（万元）</label>
                <input type="number" value={volumeMin} onChange={(e) => setVolumeMin(e.target.value)} placeholder="如 10000"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-slate-500" />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">最小流通市值（亿）</label>
                <input type="number" value={marketCapMin} onChange={(e) => setMarketCapMin(e.target.value)} placeholder="如 50"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-slate-500" />
              </div>
            </div>
            <div className="mt-4 flex gap-3">
              <button onClick={handleScreen} disabled={loading}
                className="bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 disabled:cursor-not-allowed text-white rounded-lg px-5 py-2 text-sm flex items-center gap-2">
                {loading ? <Loader2 size={15} className="animate-spin" /> : <Filter size={15} />}
                {loading ? '筛选中...' : '开始筛选'}
              </button>
            </div>
          </div>
          {loading ? (
            <div className="text-center py-12 text-slate-400 text-sm"><Loader2 size={24} className="animate-spin mx-auto mb-2" />筛选中...</div>
          ) : results.length > 0 ? (
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-700 flex items-center justify-between">
                <h2 className="font-semibold text-sm">筛选结果 ({results.length})</h2>
                <button onClick={handleSave} className="text-xs text-blue-400 hover:text-blue-300">保存结果</button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-slate-400 border-b border-slate-700">
                      <th className="text-left px-4 py-2 font-normal">代码</th><th className="text-left px-3 py-2 font-normal">名称</th>
                      <th className="text-right px-3 py-2 font-normal">现价</th><th className="text-right px-3 py-2 font-normal">涨跌幅</th>
                      <th className="text-right px-3 py-2 font-normal">换手率</th><th className="text-right px-3 py-2 font-normal">流通市值</th>
                      <th className="text-right px-3 py-2 font-normal">净流入</th><th className="text-right px-4 py-2 font-normal">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((s) => {
                      const up = (s.priceChange ?? 0) >= 0;
                      return (
                        <tr key={s.code} className="border-b border-slate-800 hover:bg-slate-700/30 cursor-pointer"
                          onClick={() => router.push(`/${locale}/stock/${s.code}`)}>
                          <td className="px-4 py-2.5 text-slate-400">{s.code}</td>
                          <td className="px-3 py-2.5 font-medium">{s.name}</td>
                          <td className="px-3 py-2.5 text-right">{s.latestPrice && s.latestPrice > 0 ? s.latestPrice.toFixed(2) : '-'}</td>
                          <td className={`px-3 py-2.5 text-right ${up ? 'text-red-400' : 'text-green-400'}`}>{up ? '+' : ''}{(s.priceChangePct ?? 0).toFixed(2)}%</td>
                          <td className="px-3 py-2.5 text-right text-slate-300">{s.turnoverRate ? s.turnoverRate.toFixed(2) + '%' : '-'}</td>
                          <td className="px-3 py-2.5 text-right text-slate-300">{fmtCap(s.marketCap)}</td>
                          <td className={`px-3 py-2.5 text-right ${up ? 'text-red-400' : 'text-green-400'}`}>{s.netInflow ? (up ? '+' : '-') + fmtAmount(Math.abs(s.netInflow)) : '-'}</td>
                          <td className="px-4 py-2.5 text-right"><button onClick={(e) => { e.stopPropagation(); router.push(`/${locale}/stock/${s.code}`); }} className="text-xs text-blue-400 hover:text-blue-300">详情</button></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : searched ? (
            <div className="text-center py-12 text-slate-400 text-sm">未找到符合条件的股票</div>
          ) : null}
          {history.length > 0 && (
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-700"><h2 className="font-semibold text-sm">选股历史</h2></div>
              <div className="divide-y divide-slate-800">
                {history.slice(0, 5).map((item: any) => (
                  <div key={item.id} className="px-4 py-3 hover:bg-slate-700/30 cursor-pointer"
                    onClick={() => router.push(`/${locale}/stock-screen/${item.id}`)}>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium">{item.title}</div>
                        <div className="text-xs text-slate-400 mt-0.5">{item.topStocks?.map((s: any) => s.name).join('、') || '暂无股票'}</div>
                      </div>
                      <div className="text-right">
                        {item.riskLevel && (
                          <span className={`text-xs px-2 py-0.5 rounded ${item.riskLevel === 'profit_high' ? 'bg-green-900/50 text-green-400' : item.riskLevel === 'risk_high' ? 'bg-red-900/50 text-red-400' : item.riskLevel === 'neutral' ? 'bg-yellow-900/50 text-yellow-400' : 'bg-slate-700 text-slate-400'}`}>{item.riskLabel || item.riskLevel}</span>
                        )}
                        <div className="text-xs text-slate-500 mt-1">{new Date(item.createdAt).toLocaleDateString('zh-CN')}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <>
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
            <div className="text-sm font-medium mb-3 flex items-center gap-2">
              <Sparkles size={15} className="text-purple-400" />描述您的选股偏好
              <span className="bg-purple-500 text-white text-[10px] px-1.5 py-0.5 rounded ml-1">会员专享</span>
            </div>
            <textarea value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)}
              placeholder="例如：帮我选近期强势的科技股，波动不大，适合稳健操作" rows={3}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-slate-500 resize-none" />
            <div className="mt-3 flex gap-3">
              <button onClick={handleAiScreen} disabled={aiLoading || !aiPrompt.trim()}
                className="bg-purple-600 hover:bg-purple-500 disabled:bg-purple-900 disabled:cursor-not-allowed text-white rounded-lg px-5 py-2 text-sm flex items-center gap-2">
                {aiLoading ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
                {aiLoading ? 'AI 选股中...' : 'AI 选股'}
              </button>
            </div>
          </div>
          {loginTip && (
            <div className="bg-red-900/20 border border-red-800 rounded-xl p-4 text-sm text-red-300">
              请先 <a href={`/${locale}/login`} className="underline">登录</a> 后再使用 AI 选股功能
            </div>
          )}
          {aiError && (
            <div className="bg-red-900/20 border border-red-800 rounded-xl p-4 text-sm text-red-300 flex items-center gap-2">
              <AlertCircle size={15} />{aiError}
            </div>
          )}
          {aiResult && (
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-sm flex items-center gap-2">
                  <Sparkles size={15} className="text-purple-400" />AI 选股结果
                </h2>
                {aiRiskLabel && (
                  <span className={`text-xs px-2 py-0.5 rounded ${aiRiskLabel.includes('收益') ? 'bg-green-900/50 text-green-400' : aiRiskLabel.includes('风险') ? 'bg-red-900/50 text-red-400' : aiRiskLabel.includes('可买') ? 'bg-yellow-900/50 text-yellow-400' : 'bg-slate-700 text-slate-400'}`}>{aiRiskLabel}</span>
                )}
              </div>
              <div className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{aiResult}</div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
