import { getMessages, getLocale } from 'next-intl/server';
import { NextIntlClientProvider } from 'next-intl';
import AppShell from '@/components/layout/appshell';
import ToasterProvider from '@/components/toaster-provider';
import { getMe } from '@/lib/auth';

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
