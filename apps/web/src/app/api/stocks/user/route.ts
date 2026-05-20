import { NextRequest, NextResponse } from 'next/server';

const NESTJS_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3002';

async function nestjsFetch(path: string, request: NextRequest, options?: RequestInit) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Origin': request.headers.get('origin') || 'http://localhost:3000',
  };
  const cookie = request.headers.get('cookie');
  if (cookie) headers['Cookie'] = cookie;

  const url = path.startsWith('http') ? path : `${NESTJS_BASE}${path}`;
  const resp = await fetch(url, {
    ...options,
    headers: { ...headers, ...(options?.headers ?? {}) },
    credentials: 'include',
  });

  // 尝试解析 JSON，失败则返回原始文本
  let data: unknown;
  const ct = resp.headers.get('content-type') ?? '';
  if (ct.includes('application/json')) {
    data = await resp.json();
  } else {
    data = await resp.text();
  }

  return { status: resp.status, data };
}

export async function GET(request: NextRequest) {
  try {
    const { status, data } = await nestjsFetch('/stocks/user', request);
    return NextResponse.json(data, { status });
  } catch (e: any) {
    return NextResponse.json({ message: 'Backend unavailable', error: e?.message }, { status: 502 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { status, data } = await nestjsFetch('/stocks/user', request, {
      method: 'POST',
      body: JSON.stringify(body),
    });
    return NextResponse.json(data, { status });
  } catch (e: any) {
    return NextResponse.json({ message: 'Backend unavailable', error: e?.message }, { status: 502 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const stockCode = searchParams.get('stockCode');
    const { status, data } = await nestjsFetch(`/stocks/user/${stockCode}`, request, {
      method: 'DELETE',
    });
    return NextResponse.json(data, { status });
  } catch (e: any) {
    return NextResponse.json({ message: 'Backend unavailable', error: e?.message }, { status: 502 });
  }
}
