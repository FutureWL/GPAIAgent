import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const limit = searchParams.get('limit') ?? '8';

  const apiUrl = process.env.NEXT_PUBLIC_API_URL
    ? `${process.env.NEXT_PUBLIC_API_URL}/stocks/hot?limit=${limit}`
    : `http://localhost:3002/stocks/hot?limit=${limit}`;

  try {
    const resp = await fetch(apiUrl, { signal: AbortSignal.timeout(10000) });
    if (!resp.ok) return NextResponse.json({ error: '热门股票接口失败' }, { status: 502 });
    const data = await resp.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: '热门股票接口超时' }, { status: 504 });
  }
}
