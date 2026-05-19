import { getMessages, getLocale } from 'next-intl/server';
import { NextIntlClientProvider } from 'next-intl';
import AppShell from '@/components/layout/appshell';
import ToasterProvider from '@/components/toaster-provider';

async function getMe() {
  try {
    const { cookies } = await import('next/headers');
    const cookieStore = await cookies();
    const token = cookieStore.get('gpai_access_token');
    if (!token) return null;

    const res = await fetch(`http://localhost:3001/auth/me`, {
      headers: { Cookie: `gpai_access_token=${token.value}` },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export default async function LocaleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const messages = await getMessages();
  const me = await getMe();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body>
        <NextIntlClientProvider messages={messages}>
          <ToasterProvider />
          <AppShell me={me} locale={locale}>
            {children}
          </AppShell>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
