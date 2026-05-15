import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import UserCard from '@/components/user/user-card';

async function getMe() {
  const cookieStore = await cookies();
  const token = cookieStore.get('gpai_access_token');
  if (!token) return null;
  try {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const res = await fetch(`${API_URL}/auth/me`, {
      headers: { Cookie: `gpai_access_token=${token.value}` },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function getStats() {
  const cookieStore = await cookies();
  const token = cookieStore.get('gpai_access_token');
  if (!token) return null;
  try {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const res = await fetch(`${API_URL}/auth/stats`, {
      headers: { Cookie: `gpai_access_token=${token.value}` },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export default async function ProfilePage() {
  const me = await getMe();
  if (!me) {
    redirect('/login');
  }

  const stats = await getStats();

  return (
    <div className="max-w-2xl mx-auto">
      <UserCard user={me} stats={stats || undefined} />
    </div>
  );
}
