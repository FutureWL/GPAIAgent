import { redirect } from 'next/navigation';
import GuestShell from '@/components/layout/guest-shell';
import { getMe } from '@/lib/auth';

export default async function GuestLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  return (
    <GuestShell>
      {children}
    </GuestShell>
  );
}
