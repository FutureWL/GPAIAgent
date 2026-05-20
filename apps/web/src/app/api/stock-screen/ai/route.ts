import { NextRequest, NextResponse } from 'next/server';
const NESTJS_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3002';
async function nestjsFetch(path: string, request: NextRequest, options?: RequestInit) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json', 'Accept': 'application/json', 'Origin': request.headers.get('origin') || 'http://localhost:3000' };
  const cookie = request.headers.get('cookie');
  if (cookie) headers['Cookie'] = cookie;
  const url = `${NESTJS_BASE}${path}`;
  const resp = await fetch(url, { ...options, headers: { ...headers, ...(options?.headers ?? {}) }, credentials: 'include' });
  let data: unknown;
  const ct = resp.headers.get('content-type') ?? '';
  if (ct.includes('application/json')) data = await resp.json(); else data = await resp.text();
  return { status: resp.status, data };
}
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { status, data } = await nestjsFetch('/stock-screen/ai', request, { method: 'POST', body: JSON.stringify(body) });
    return NextResponse.json(data, { status });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ message: 'Backend unavailable', error: msg }, { status: 502 });
  }
}
