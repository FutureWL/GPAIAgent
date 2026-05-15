'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { ChevronLeft, ChevronRight, TrendingUp, BarChart3, Star, LineChart, Users, Crown, PenSquare, LayoutDashboard } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface NavItem {
  href: string;
  labelZh: string;
  labelEn: string;
  icon: React.ReactNode;
}

const NAV_ITEMS: NavItem[] = [
  { href: '/home', labelZh: '首页', labelEn: 'Home', icon: <LayoutDashboard className="w-4 h-4" /> },
  { href: '/blog', labelZh: '博客', labelEn: 'Blog', icon: <Users className="w-4 h-4" /> },
  { href: '/watchlist', labelZh: '自选股', labelEn: 'Watchlist', icon: <Star className="w-4 h-4" /> },
  { href: '/market', labelZh: '行情', labelEn: 'Market', icon: <LineChart className="w-4 h-4" /> },
  { href: '/strategies', labelZh: '策略广场', labelEn: 'Strategies', icon: <BarChart3 className="w-4 h-4" /> },
  { href: '/strategies/new', labelZh: '发布策略', labelEn: 'Publish', icon: <PenSquare className="w-4 h-4" /> },
  { href: '/membership', labelZh: '会员中心', labelEn: 'Membership', icon: <Crown className="w-4 h-4" /> },
];

interface SidebarProps {
  locale: 'zh' | 'en';
  username?: string;
}

export default function Sidebar({ locale, username }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        'flex flex-col h-full border-r bg-card transition-all duration-200',
        collapsed ? 'w-16' : 'w-56'
      )}
    >
      {/* Logo */}
      <div className="flex items-center justify-between px-3 py-4 border-b border-border">
        {!collapsed && (
          <div>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              <span className="font-bold text-lg">GPAIAgent</span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {locale === 'zh' ? '短线炒股辅助平台' : 'Trading Assistant'}
            </p>
          </div>
        )}
        {collapsed && <TrendingUp className="w-5 h-5 text-primary mx-auto" />}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className="h-7 w-7 flex-shrink-0"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </Button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          const label = locale === 'zh' ? item.labelZh : item.labelEn;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors mb-0.5',
                isActive
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                collapsed && 'justify-center px-0'
              )}
              title={collapsed ? label : undefined}
            >
              {item.icon}
              {!collapsed && <span>{label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* User avatar at bottom — shows username when logged in */}
      <div className="p-3 border-t border-border">
        <div className={cn('flex items-center gap-2', collapsed && 'justify-center')}>
          {username ? (
            <>
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-sm font-medium flex-shrink-0">
                {username[0].toUpperCase()}
              </div>
              {!collapsed && (
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{username}</div>
                </div>
              )}
            </>
          ) : null}
        </div>
      </div>
    </aside>
  );
}
