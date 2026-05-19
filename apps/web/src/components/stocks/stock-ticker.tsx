'use client';

import { useState, useEffect, useRef } from 'react';

interface Quote {
  code: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
}

const DEFAULT_CODES = 'sh000001,sz399001,sz399006,sh600519,sz000858';

export default function StockTicker() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchQuotes = async () => {
    try {
      const resp = await fetch(`/api/stocks/quotes?codes=${DEFAULT_CODES}`, {
        signal: AbortSignal.timeout(10000),
      });
      const data = await resp.json();
      // API returns { error: string } on failure, or array on success
      if (!resp.ok || !Array.isArray(data) || data.length === 0) {
        setUnavailable(true);
        return;
      }
      setQuotes(data);
      setUnavailable(false);
    } catch {
      setUnavailable(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuotes();
    const interval = setInterval(fetchQuotes, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="h-8 bg-primary/90 flex items-center px-4 text-xs text-white/80 overflow-hidden dark:bg-primary/70 dark:text-white/70">
        <span className="animate-pulse">加载行情数据...</span>
      </div>
    );
  }

  if (unavailable || !quotes.length) {
    return (
      <div className="h-8 bg-primary/90 flex items-center px-4 text-xs text-white/60 dark:bg-primary/70 dark:text-white/50">
        {unavailable ? '行情数据暂不可用' : ''}
      </div>
    );
  }

  const items = [...quotes, ...quotes];

  return (
    <div className="h-8 bg-primary/90 flex items-center overflow-hidden">
      <div
        ref={scrollRef}
        className="flex items-center gap-6 whitespace-nowrap"
        style={{ animation: 'scroll 40s linear infinite' }}
      >
        <style>{`
          @keyframes scroll {
            0% { transform: translateX(0); }
            100% { transform: translateX(-50%); }
          }
        `}</style>
        {items.map((q, i) => (
          <span key={`${q.code}-${i}`} className="flex items-center gap-2 text-xs text-white shrink-0">
            <span className="font-medium">{q.name}</span>
            <span className="font-mono">{q.price.toFixed(2)}</span>
            <span className={q.change >= 0 ? 'text-red-400' : 'text-green-400'}>
              {q.change >= 0 ? '+' : ''}{q.change.toFixed(2)}
            </span>
            <span className={q.changePercent >= 0 ? 'text-red-400' : 'text-green-400'}>
              ({q.changePercent >= 0 ? '+' : ''}{q.changePercent.toFixed(2)}%)
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}
