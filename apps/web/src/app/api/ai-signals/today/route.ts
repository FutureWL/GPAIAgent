import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const limit = searchParams.get('limit') ?? '3';

  const apiUrl = process.env.NEXT_PUBLIC_API_URL
    ? `${process.env.NEXT_PUBLIC_API_URL}/ai-signals/today?limit=${limit}`
    : `http://localhost:3002/ai-signals/today?limit=${limit}`;

  try {
    const resp = await fetch(apiUrl, { signal: AbortSignal.timeout(10000) });
    if (!resp.ok) return NextResponse.json({ error: 'AI信号接口失败' }, { status: 502 });
    const data = await resp.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'AI信号接口超时' }, { status: 504 });
  }
}
