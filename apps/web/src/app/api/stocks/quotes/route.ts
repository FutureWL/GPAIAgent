import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const codes = searchParams.get('codes') ?? 'sh000001,sz399001,sz399006,sh600519,sz000858';

  const apiUrl = process.env.NEXT_PUBLIC_API_URL
    ? `${process.env.NEXT_PUBLIC_API_URL}/stocks/quotes?codes=${codes}`
    : `${process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3002'}/stocks/quotes?codes=${codes}`;

  try {
    const resp = await fetch(apiUrl, { signal: AbortSignal.timeout(10000) });
    if (!resp.ok) return NextResponse.json({ error: '行情接口失败' }, { status: 502 });
    const data = await resp.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: '行情接口超时' }, { status: 504 });
  }
}
