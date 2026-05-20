import { cookies } from 'next/headers';

export interface MeUser {
  id: string;
  username: string;
  name?: string | null;
  avatar?: string | null;
  email?: string | null;
  bio?: string | null;
  membership?: {
    level: string;
    type: string;
    status: string;
    expiredAt: string;
  } | null;
}

export async function getMe(): Promise<MeUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('gpai_access_token');
    if (!token) return null;
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/me`, {
      headers: { Cookie: `gpai_access_token=${token.value}` },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function getStats() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('gpai_access_token');
    if (!token) return null;
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/stats`, {
      headers: { Cookie: `gpai_access_token=${token.value}` },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}
