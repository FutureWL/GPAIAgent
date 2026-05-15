import type { ReactNode } from 'react';
import '@/styles/globals.css';
import 'antd/dist/reset.css';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh">
      <body>{children}</body>
    </html>
  );
}
