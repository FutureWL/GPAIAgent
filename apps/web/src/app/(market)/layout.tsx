import { cookies } from 'next/headers';
import AppShell from '@/components/AppShell';

async function getMe() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('access_token');
    if (!token) return null;

    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const res = await fetch(`${API_URL}/auth/me`, {
      headers: { Cookie: `access_token=${token.value}` },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export default async function MarketLayout({ children }: { children: React.ReactNode }) {
  const me = await getMe();
  return <AppShell username={me?.username}>{children}</AppShell>;
}
