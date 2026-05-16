import { NextRequest, NextResponse } from 'next/server';

const PROD_API = 'http://localhost:3003';
const DEV_API  = 'http://localhost:3001';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const { searchParams } = new URL(request.url);
  const days = searchParams.get('days') ?? '120';

  // 开发环境用 localhost:3001，生产环境用 localhost:3003
  const apiUrl = process.env.NEXT_PUBLIC_API_URL
    ? `${process.env.NEXT_PUBLIC_API_URL}/stocks/${code}/daily?days=${days}`
    : `${DEV_API}/api/stocks/${code}/daily?days=${days}`;

  try {
    const resp = await fetch(apiUrl, { signal: AbortSignal.timeout(10000) });
    if (!resp.ok) return NextResponse.json({ error: `接口失败: ${resp.status}` }, { status: 502 });
    const data = await resp.json();
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 504 });
  }
}
