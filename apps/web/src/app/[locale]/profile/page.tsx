import { redirect } from 'next/navigation';
import UserCard from '@/components/user/user-card';
import { getMe, getStats } from '@/lib/auth';

export default async function ProfilePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const me = await getMe();
  if (!me) {
    redirect(`/${locale}/login`);
  }

  const stats = await getStats();

  return (
    <div className="max-w-2xl mx-auto">
      <UserCard user={me} stats={stats || undefined} />
    </div>
  );
}
