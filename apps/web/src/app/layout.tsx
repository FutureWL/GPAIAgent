import type { ReactNode } from 'react';
import { ThemeProvider } from 'next-themes';
import '@/styles/globals.css';
import 'antd/dist/reset.css';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh" suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
