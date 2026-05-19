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
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        {/* Brand accent line */}
        <div className="h-[2px] w-full bg-gradient-to-r from-primary via-primary/60 to-transparent" />
        <div className="flex items-center h-14 px-6 gap-6">
          {/* Logo */}
          <Link href={`/${locale}`} className="flex items-center gap-2.5 shrink-0 group">
            <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
              <Icon name={icons.TrendingUp} className="h-4 w-4 text-primary" />
            </div>
            <div className="flex flex-col leading-none">
              <span className="font-bold text-base tracking-tight text-foreground">GPAIAgent</span>
              <span className="text-[10px] text-muted-foreground font-normal tracking-widest uppercase">{isZh ? '金融' : 'Finance'}</span>
            </div>
          </Link>

          {/* Nav links */}
          <nav className="flex items-center gap-0.5">
            {NAV_ITEMS.map((item) => {
              const href = item.href ? `/${locale}/${item.href}` : `/${locale}`;
              const isActive = item.href === ''
                ? pathname === `/${locale}` || pathname === `/${locale}/`
                : pathname.startsWith(`/${locale}/${item.href}`);
              return (
                <Link key={item.href} href={href}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      'text-sm px-3',
                      isActive && 'bg-accent text-accent-foreground font-medium'
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

          {/* Market status indicator */}
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            {t('实时行情', 'Live')}
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-1">
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
              className="text-xs h-8 px-2.5 font-medium"
              onClick={() => switchLocale(isZh ? 'en' : 'zh')}
            >
              {isZh ? 'EN' : '中文'}
            </Button>

            <div className="w-px h-4 bg-border mx-1" />

            {/* Login / Register */}
            <Link href={`/${locale}/login`}>
              <Button variant="ghost" size="sm" className="text-sm h-8">
                {t('登录', 'Login')}
              </Button>
            </Link>
            <Link href={`/${locale}/register`}>
              <Button variant="default" size="sm" className="text-sm h-8 font-medium">
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
      <footer className="border-t border-border bg-card/50">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mb-8">
            {/* Brand */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center h-7 w-7 rounded-md bg-primary/10">
                  <Icon name={icons.TrendingUp} className="h-3.5 w-3.5 text-primary" />
                </div>
                <span className="font-bold text-sm text-foreground">GPAIAgent</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {isZh
                  ? 'AI 驱动的智能炒股辅助系统，策略共享与交流社区。'
                  : 'AI-powered stock trading assistant with strategy sharing community.'}
              </p>
            </div>

            {/* Quick links */}
            <div>
              <h4 className="text-xs font-semibold text-foreground mb-3 uppercase tracking-wider">
                {isZh ? '快速链接' : 'Quick Links'}
              </h4>
              <ul className="space-y-2">
                {[
                  { href: `/${locale}/market`, label: t('行情', 'Market') },
                  { href: `/${locale}/blog`, label: t('博客', 'Blog') },
                  { href: `/${locale}/login`, label: t('登录', 'Login') },
                  { href: `/${locale}/register`, label: t('注册', 'Register') },
                ].map(({ href, label }) => (
                  <li key={href}>
                    <Link href={href} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Disclaimer */}
            <div>
              <h4 className="text-xs font-semibold text-foreground mb-3 uppercase tracking-wider">
                {isZh ? '风险提示' : 'Risk Disclaimer'}
              </h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {isZh
                  ? '本平台仅供信息参考，不构成投资建议。投资有风险，决策需谨慎。'
                  : 'For informational purposes only. Not investment advice. Trade at your own risk.'}
              </p>
            </div>
          </div>

          <div className="pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3">
            <span className="text-xs text-muted-foreground">
              © {new Date().getFullYear()} GPAIAgent. {t('保留所有权利。', 'All rights reserved.')}
            </span>
            <div className="flex items-center gap-4">
              <a href="mailto:support@gpaiagent.com" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                {isZh ? '联系我们' : 'Contact'}
              </a>
              <a href="#" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                {isZh ? '隐私政策' : 'Privacy'}
              </a>
              <a href="#" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                {isZh ? '服务条款' : 'Terms'}
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
