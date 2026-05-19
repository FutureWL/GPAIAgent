import { NextRequest, NextResponse } from 'next/server';

const DEV_API  = 'http://localhost:3001';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const { searchParams } = new URL(request.url);
  const days = searchParams.get('days') ?? '120';
  const period = searchParams.get('period');

  // 优先走 /kline 统一入口（支持所有周期）
  // 不传 period 则走旧的 /daily 路由（保持兼容）
  const targetPath = period
    ? `/stocks/${code}/kline?period=${period}&count=${days}`
    : `/stocks/${code}/daily?days=${days}`;

  const apiUrl = process.env.NEXT_PUBLIC_API_URL
    ? `${process.env.NEXT_PUBLIC_API_URL}${targetPath}`
    : `${DEV_API}${targetPath}`;

  try {
    const resp = await fetch(apiUrl, { signal: AbortSignal.timeout(10000) });
    if (!resp.ok) return NextResponse.json({ error: `接口失败: ${resp.status}` }, { status: 502 });
    const data = await resp.json();
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 504 });
  }
}
