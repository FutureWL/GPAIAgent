import { getMessages, getLocale } from 'next-intl/server';
import { NextIntlClientProvider } from 'next-intl';
import ToasterProvider from '@/components/toaster-provider';

export default async function LocaleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body>
        <NextIntlClientProvider messages={messages}>
          <ToasterProvider />
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
