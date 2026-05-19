'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { Icon, icons } from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const NAV_ITEMS = (locale: string) => [
  {
    href: `/${locale}/admin`,
    labelZh: '仪表盘',
    labelEn: 'Dashboard',
    iconName: 'LayoutDashboard',
    end: true,
  },
  {
    href: `/${locale}/admin/users`,
    labelZh: '用户管理',
    labelEn: 'User Management',
    iconName: 'Users',
  },
  {
    href: `/${locale}/admin/posts`,
    labelZh: '博客管理',
    labelEn: 'Blog Management',
    iconName: 'FileText',
  },
  {
    href: `/${locale}/admin/comments`,
    labelZh: '评论管理',
    labelEn: 'Comments',
    iconName: 'MessageSquare',
  },
  {
    href: `/${locale}/admin/memberships`,
    labelZh: '会员管理',
    labelEn: 'Memberships',
    iconName: 'CreditCard',
  },
  {
    href: `/${locale}/admin/stocks`,
    labelZh: '股票管理',
    labelEn: 'Stock Management',
    iconName: 'TrendingUp',
  },
  {
    href: `/${locale}/admin/ai-generations`,
    labelZh: 'AI 生成记录',
    labelEn: 'AI Generations',
    iconName: 'BotMessageSquare',
  },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const locale = useLocale() as 'zh' | 'en';
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const navItems = NAV_ITEMS(locale);

  const handleLogout = () => {
    document.cookie = 'gpai_access_token=; Max-Age=0; path=/';
    router.push(`/${locale}/login`);
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside
        className={cn(
          'flex flex-col bg-muted border-r border-border transition-all duration-200',
          collapsed ? 'w-16' : 'w-56'
        )}
      >
        {/* Logo */}
        <div className="flex items-center h-14 border-b border-border px-3">
          <Icon name={icons.ShieldCheck} className="h-5 w-5 text-primary shrink-0" />
          {!collapsed && (
            <span className="ml-2 text-sm font-bold tracking-wide text-foreground">
              GPAI {locale === 'zh' ? '管理后台' : 'Admin'}
            </span>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 py-2 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = item.end
              ? pathname === item.href
              : pathname.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href}>
                <div
                  className={cn(
                    'flex items-center mx-2 px-3 py-2 rounded-md text-sm transition-colors cursor-pointer',
                    isActive
                      ? 'bg-primary text-primary-foreground font-medium'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  )}
                >
                  <Icon name={item.iconName as any} className="h-4 w-4 shrink-0" />
                  {!collapsed && (
                    <span className="ml-3">
                      {locale === 'zh' ? item.labelZh : item.labelEn}
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Collapse toggle */}
        <div className="border-t border-border p-2">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-center"
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? (
              <Icon name={icons.ChevronRight} className="h-4 w-4" />
            ) : (
              <Icon name={icons.ChevronLeft} className="h-4 w-4" />
            )}
          </Button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Header */}
        <header className="flex items-center justify-between h-14 border-b border-border bg-card px-6">
          <div className="text-sm text-muted-foreground">
            {locale === 'zh' ? '管理控制台' : 'Admin Console'}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="text-muted-foreground hover:text-destructive"
          >
            <Icon name={icons.LogOut} className="h-4 w-4 mr-1.5" />
            {locale === 'zh' ? '退出登录' : 'Sign Out'}
          </Button>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
