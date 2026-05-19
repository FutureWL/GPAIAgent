'use client';

import React, { useState } from 'react';
import { Providers } from '@/components/providers';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  FileText,
  MessageSquare,
  CreditCard,
  TrendingUp,
  BotMessageSquare,
  ChevronLeft,
  ChevronRight,
  LogOut,
  ShieldCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/zh/admin', label: '仪表盘', icon: LayoutDashboard, end: true },
  { href: '/zh/admin/users', label: '用户管理', icon: Users },
  { href: '/zh/admin/posts', label: '博客管理', icon: FileText },
  { href: '/zh/admin/comments', label: '评论管理', icon: MessageSquare },
  { href: '/zh/admin/memberships', label: '会员管理', icon: CreditCard },
  { href: '/zh/admin/stocks', label: '股票管理', icon: TrendingUp },
  { href: '/zh/admin/ai-generations', label: 'AI 生成记录', icon: BotMessageSquare },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = () => {
    document.cookie = 'gpai_access_token=; Max-Age=0; path=/';
    router.push('/zh/login');
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
          <ShieldCheck className="h-5 w-5 text-primary shrink-0" />
          {!collapsed && (
            <span className="ml-2 text-sm font-bold tracking-wide text-foreground">
              GPAI 管理后台
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
                  <item.icon className="h-4 w-4 shrink-0" />
                  {!collapsed && <span className="ml-3">{item.label}</span>}
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
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Header */}
        <header className="flex items-center justify-between h-14 border-b border-border bg-card px-6">
          <div className="text-sm text-muted-foreground">
            管理控制台
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="text-muted-foreground hover:text-destructive"
          >
            <LogOut className="h-4 w-4 mr-1.5" />
            退出登录
          </Button>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6">
          <Providers>{children}</Providers>
        </main>
      </div>
    </div>
  );
}
