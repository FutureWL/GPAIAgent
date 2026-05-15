import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const token = request.cookies.get('gpai_access_token')?.value;

    if (token) {
      await fetch(`${API_URL}/auth/logout`, {
        method: 'POST',
        headers: {
          Cookie: `gpai_access_token=${token}`,
        },
      });
    }
  } catch {
    // Ignore errors, always clear cookies
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.delete('gpai_access_token');
  response.cookies.delete('gpai_refresh_token');
  return response;
}
