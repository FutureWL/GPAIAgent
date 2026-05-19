'use client';

import { ConfigProvider, theme } from 'antd';
import { useTheme } from 'next-themes';

export default function AntdProvider({ children }: { children: React.ReactNode }) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  return (
    <ConfigProvider
      theme={{
        algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: {
          colorPrimary: '#2563eb',
          borderRadius: 6,
        },
      }}
    >
      {children}
    </ConfigProvider>
  );
}
