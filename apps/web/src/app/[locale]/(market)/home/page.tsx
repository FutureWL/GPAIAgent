import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import HomeContent from './HomeContent';

async function getMe() {
  const cookieStore = await cookies();
  const token = cookieStore.get('gpai_access_token')?.value;
  if (!token) return null;
  try {
    const res = await fetch(`http://localhost:3001/auth/me`, {
      headers: { Cookie: `gpai_access_token=${token}` },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const me = await getMe();

  if (!me) {
    redirect(`/${locale}/login`);
  }

  return <HomeContent username={me.username} />;
}
