import { redirect } from 'next/navigation';
import AppShell from '@/components/layout/appshell';
import { getMe } from '@/lib/auth';

export default async function UserLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const me = await getMe();

  if (!me) {
    redirect(`/${locale}/login`);
  }

  return (
    <AppShell me={me} locale={locale}>
      {children}
    </AppShell>
  );
}
