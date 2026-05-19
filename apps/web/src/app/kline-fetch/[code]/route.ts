import { NextRequest, NextResponse } from 'next/server';

// 东方财富 K 线服务端代理（绕过 next.config 代理限制）
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const { searchParams } = new URL(request.url);
  const period = searchParams.get('period') ?? 'day';

  // 东方财富 secid: 1=上证, 0=深证
  const numCode = code.replace(/^(sh|sz)/, '');
  const market = code.startsWith('sh') ? 1 : 0;
  const secid = `${market}.${numCode}`;

  // klt: 101=日K, 102=周K, 103=月K
  const kltMap: Record<string, number> = { day: 101, week: 102, month: 103 };
  const klt = kltMap[period] ?? 101;

  const url = `https://push2his.eastmoney.com/api/qt/stock/kline/get?secid=${secid}&fields1=f1,f2,f3,f4,f5,f6&fields2=f51,f52,f53,f54,f55,f56,f57,f58&klt=${klt}&fqt=1&beg=0&end=20500101&lmt=${period === 'day' ? 300 : 200}`;

  try {
    const resp = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        Referer: 'https://finance.eastmoney.com',
      },
      signal: AbortSignal.timeout(15000),
    });
    if (!resp.ok) {
      const text = await resp.text();
      return NextResponse.json({ error: `HTTP ${resp.status}: ${text.slice(0, 100)}` }, { status: 502 });
    }
    const data = await resp.json();
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 504 });
  }
}
