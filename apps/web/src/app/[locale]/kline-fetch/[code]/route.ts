import { NextRequest, NextResponse } from 'next/server';

// 新浪 K 线接口服务端代理
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const { searchParams } = new URL(request.url);
  const period = searchParams.get('period') ?? 'day';

  // 新浪 scale: 5/15/30/60=分钟, 240=日, 1440=周?
  // 日K用scale=240, 周K用1周 (Sina不支持直接获取周K, 用日K前端聚合)
  const scaleMap: Record<string, string> = { day: '240', week: '240', month: '240' };
  const scale = scaleMap[period] ?? '240';
  const datalen = period === 'day' ? '300' : period === 'week' ? '200' : '100';

  const url = `https://quotes.sina.cn/cn/api/json_v2.php/CN_MarketData.getKLineData?symbol=${code}&scale=${scale}&ma=no&datalen=${datalen}`;

  try {
    const resp = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0', Referer: 'https://finance.sina.com.cn' },
      signal: AbortSignal.timeout(15000),
    });
    if (!resp.ok) return NextResponse.json({ error: `HTTP ${resp.status}` }, { status: 502 });
    const data = await resp.json();
    return NextResponse.json(Array.isArray(data) ? data : []);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 504 });
  }
}
