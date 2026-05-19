import { NextRequest, NextResponse } from 'next/server';

const DEV_API = 'http://localhost:3001';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const { searchParams } = new URL(request.url);
  const period = searchParams.get('period') ?? 'day';
  const count = searchParams.get('count') ?? '120';

  const apiUrl = process.env.NEXT_PUBLIC_API_URL
    ? `${process.env.NEXT_PUBLIC_API_URL}/stocks/${code}/kline?period=${period}&count=${count}`
    : `${DEV_API}/stocks/${code}/kline?period=${period}&count=${count}`;

  try {
    const resp = await fetch(apiUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(15000),
    });
    if (!resp.ok) return NextResponse.json({ error: `接口失败: ${resp.status}` }, { status: 502 });
    const data = await resp.json();

    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 504 });
  }
}
