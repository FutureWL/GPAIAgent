import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  // Call backend logout endpoint
  try {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const token = request.cookies.get('access_token')?.value;

    if (token) {
      await fetch(`${API_URL}/auth/logout`, {
        method: 'POST',
        headers: {
          Cookie: `access_token=${token}`,
        },
      });
    }
  } catch {
    // Ignore errors, always clear cookies
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.delete('access_token');
  response.cookies.delete('gpai_access_token');
  return response;
}
