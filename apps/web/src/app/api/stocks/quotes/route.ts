import { NextRequest, NextResponse } from 'next/server';

const EAST_MONEY_BASE = 'https://push2.eastmoney.com/api/qt/ulist.np/get';
const DEFAULT_CODES = ['sh000001', 'sz399001', 'sz399006', 'sh600519', 'sz000858'];

function toSecid(code: string): string {
  const pure = code.replace(/^(sh|sz)/, '');
  return pure.startsWith('6') ? `1.${pure}` : `0.${pure}`;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const codes = searchParams.get('codes')?.split(',').filter(Boolean) ?? DEFAULT_CODES;

  const secids = codes.map(toSecid).join(',');
  const url = `${EAST_MONEY_BASE}?secids=${secids}&fields=f12,f14,f2,f3,f4,f5,f15,f16,f17,f18`;

  try {
    const resp = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(8000),
    });
    if (!resp.ok) return NextResponse.json({ error: '行情接口失败' }, { status: 502 });

    const json = await resp.json();
    const list: any[] = json.data?.diff ?? [];

    const quotes = list.map((d: any) => ({
      code: d.f12,
      name: d.f14,
      price: d.f2 / 100,
      change: d.f4 / 100,
      changePercent: d.f3 / 100,
      volume: d.f5,
      high: d.f15 / 100,
      low: d.f16 / 100,
      open: d.f17 / 100,
      preClose: d.f18 / 100,
      market: d.f12?.startsWith('6') ? '沪' : '深',
    }));

    return NextResponse.json(quotes);
  } catch {
    return NextResponse.json({ error: '行情接口超时' }, { status: 504 });
  }
}
