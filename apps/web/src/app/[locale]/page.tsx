import { redirect } from 'next/navigation';
import { getMe } from '@/lib/auth';

export default async function LocaleHomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const me = await getMe();
  if (!me) {
    redirect(`/${locale}/login`);
  }
  redirect(`/${locale}/home`);
}
