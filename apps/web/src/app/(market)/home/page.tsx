import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import AppShell from '@/components/AppShell';
import HomeContent from './HomeContent';

async function getMe() {
  const cookieStore = await cookies();
  const token = cookieStore.get('gpai_access_token')?.value;
  if (!token) return null;
  try {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const res = await fetch(`${API_URL}/auth/me`, {
      headers: { Cookie: `gpai_access_token=${token}` },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export default async function HomePage() {
  const me = await getMe();

  if (!me) {
    redirect('/login');
  }

  return (
    <AppShell username={me.username}>
      <HomeContent username={me.username} />
    </AppShell>
  );
}
