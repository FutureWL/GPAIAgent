import { redirect } from 'next/navigation';
import HomeContent from './HomeContent';
import { getMe } from '@/lib/auth';

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const me = await getMe();

  if (!me) {
    redirect(`/${locale}/login`);
  }

  return <HomeContent username={me.username} />;
}
