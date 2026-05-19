'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { useLocale } from 'next-intl';
import { Icon, icons } from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { href: '', labelZh: '首页', labelEn: 'Home' },
  { href: 'market', labelZh: '行情', labelEn: 'Market' },
  { href: 'blog', labelZh: '博客', labelEn: 'Blog' },
];

export default function GuestShell({ children }: { children: React.ReactNode }) {
  const locale = useLocale() as 'zh' | 'en';
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const isZh = locale === 'zh';

  const switchLocale = (newLocale: string) => {
    const newPath = pathname.replace(/^\/(zh|en)/, `/${newLocale}`);
    router.replace(newPath);
  };

  const t = (zh: string, en: string) => (isZh ? zh : en);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Top bar */}
      <header className="sticky top-0 z-40 h-14 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center h-full px-6 gap-6">
          {/* Logo */}
          <Link href={`/${locale}`} className="flex items-center gap-2 shrink-0">
            <Icon name={icons.TrendingUp} className="h-5 w-5 text-primary" />
            <span className="font-bold text-base tracking-wide text-foreground">
              GPAI
            </span>
          </Link>

          {/* Nav links */}
          <nav className="flex items-center gap-1">
            {NAV_ITEMS.map((item) => {
              const href = `/${locale}/${item.href}`;
              const isActive = item.href === ''
                ? pathname === `/${locale}` || pathname === `/${locale}/`
                : pathname.startsWith(`/${locale}/${item.href}`);
              return (
                <Link key={item.href} href={href}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      'text-sm',
                      isActive && 'bg-accent text-accent-foreground'
                    )}
                  >
                    {isZh ? item.labelZh : item.labelEn}
                  </Button>
                </Link>
              );
            })}
          </nav>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Right controls */}
          <div className="flex items-center gap-2">
            {/* Theme switch */}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              title={isZh ? '切换主题' : 'Toggle theme'}
            >
              <Icon
                name={theme === 'dark' ? icons.Sun : icons.Moon}
                className="h-4 w-4"
              />
            </Button>

            {/* Locale switch */}
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-8"
              onClick={() => switchLocale(isZh ? 'en' : 'zh')}
            >
              {isZh ? 'EN' : '中文'}
            </Button>

            {/* Login / Register */}
            <Link href={`/${locale}/login`}>
              <Button variant="outline" size="sm" className="text-sm h-8">
                {t('登录', 'Login')}
              </Button>
            </Link>
            <Link href={`/${locale}/register`}>
              <Button variant="default" size="sm" className="text-sm h-8">
                {t('注册', 'Register')}
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-6 px-6">
        <div className="max-w-5xl mx-auto flex items-center justify-between text-xs text-muted-foreground">
          <span>© 2024 GPAI. {t('保留所有权利。', 'All rights reserved.')}</span>
          <div className="flex items-center gap-4">
            <Link href={`/${locale}/blog`} className="hover:text-foreground transition-colors">
              {t('博客', 'Blog')}
            </Link>
            <a href="mailto:support@gpai.com" className="hover:text-foreground transition-colors">
              {t('联系我们', 'Contact')}
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
