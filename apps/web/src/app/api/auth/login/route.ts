import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';
    const body = await request.json();

    console.log('[login] calling:', `${API_URL}/auth/login`);

    let res;
    try {
      res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        credentials: 'include',
      });
    } catch (fetchErr) {
      console.error('[login] fetch error:', fetchErr);
      return NextResponse.json({ message: '后端连接失败' }, { status: 502 });
    }

    console.log('[login] backend status:', res.status);

    const data = await res.json();
    const response = NextResponse.json(data, { status: res.status });

    // 透传所有 Set-Cookie（HttpOnly cookies）
    const setCookies = res.headers.getSetCookie();
    if (setCookies.length > 0) {
      setCookies.forEach((cookie) => {
        response.headers.append('set-cookie', cookie);
      });
    }

    return response;
  } catch (err) {
    console.error('[login] unknown error:', err);
    return NextResponse.json({ message: '服务器内部错误' }, { status: 500 });
  }
}
