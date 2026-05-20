import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3002';
    const token = request.cookies.get('gpai_access_token')?.value;

    const res = await fetch(`${API_URL}/auth/me`, {
      method: 'GET',
      headers: {
        Cookie: token ? `gpai_access_token=${token}` : '',
      },
      credentials: 'include',
    });

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json(data, { status: res.status });
    }

    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    console.error('[auth/me]', err);
    return NextResponse.json({ message: '服务器内部错误' }, { status: 500 });
  }
}
