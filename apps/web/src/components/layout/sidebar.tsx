'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Icon, icons } from '@/components/ui/icon';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

interface User {
  id: string;
  username: string;
  name?: string | null;
  avatar?: string | null;
  membership?: {
    level: string;
    type: string;
    status: string;
    expiredAt: string;
  } | null;
}

interface SidebarProps {
  locale: 'zh' | 'en';
  me?: User | null;
}

const NAV_ITEMS = [
  { key: 'home', labelZh: '首页', labelEn: 'Home', href: '/home', icon: 'LayoutDashboard' as const },
  { key: 'blog', labelZh: '博客', labelEn: 'Blog', href: '/blog', icon: 'FileText' as const },
  { key: 'watchlist', labelZh: '自选股', labelEn: 'Watchlist', href: '/watchlist', icon: 'Star' as const },
  { key: 'stock-screen', labelZh: '选股', labelEn: 'Stock Screen', href: '/stock-screen', icon: 'Search' as const },
  { key: 'market', labelZh: '行情', labelEn: 'Market', href: '/market', icon: 'ChartLine' as const },
  { key: 'strategies', labelZh: '策略广场', labelEn: 'Strategies', href: '/strategies', icon: 'ChartBarBig' as const },
  { key: 'membership', labelZh: '会员中心', labelEn: 'Membership', href: '/membership', icon: 'Crown' as const },
];

const MEMBERSHIP_LABELS_ZH: Record<string, string> = { NORMAL: '普通会员', PRIVATE: '私人会员' };
const MEMBERSHIP_LABELS_EN: Record<string, string> = { NORMAL: 'Normal', PRIVATE: 'Private' };
const MEMBERSHIP_BADGE_VARIANTS: Record<string, 'default' | 'secondary'> = {
  NORMAL: 'default',
  PRIVATE: 'secondary',
};

export default function Sidebar({ locale, me }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('sidebar-collapsed') === 'true';
    }
    return false;
  });

  const isActive = (href: string) => pathname === `/${locale}${href}` || pathname.startsWith(`/${locale}${href}/`);
  const displayName = me?.name || me?.username || '';
  const initials = displayName.slice(0, 1).toUpperCase();
  const isZh = locale === 'zh';
  const membershipLabel = isZh
    ? MEMBERSHIP_LABELS_ZH[me?.membership?.level ?? ''] ?? ''
    : MEMBERSHIP_LABELS_EN[me?.membership?.level ?? ''] ?? '';
  const membershipVariant = MEMBERSHIP_BADGE_VARIANTS[me?.membership?.level ?? ''] ?? 'default';

  return (
    <aside
      className="flex flex-col h-full border-r bg-card transition-all duration-200"
      style={{ width: collapsed ? 64 : 224 }}
    >
      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.key}
            href={`/${locale}${item.href}`}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors mb-0.5 ${
              isActive(item.href)
                ? 'bg-primary/10 text-primary font-medium'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            }`}
          >
            <span className="flex-shrink-0">
              <Icon name={item.icon} className="w-[18px] h-[18px]" />
            </span>
            {!collapsed && <span>{isZh ? item.labelZh : item.labelEn}</span>}
          </Link>
        ))}

        {/* Login hint when not logged in */}
        {!me && !collapsed && (
          <div className="mt-4 px-3 text-xs text-muted-foreground text-center py-2">
            {isZh ? '登录后享受更多功能' : 'Sign in for more features'}
          </div>
        )}
      </nav>

      {/* User area */}
      {me && (
        <div className="px-2 py-3 border-t border-border">
          <Link
            href={`/${locale}/profile`}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors mb-1 ${
              isActive('/profile')
                ? 'bg-primary/10 text-primary font-medium'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            }`}
          >
            <span className="flex-shrink-0"><Icon name={icons.User} className="w-[18px] h-[18px]" /></span>
            {!collapsed && <span>{isZh ? '个人主页' : 'Profile'}</span>}
          </Link>
          <Link
            href={`/${locale}/settings`}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
              isActive('/settings')
                ? 'bg-primary/10 text-primary font-medium'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            }`}
          >
            <span className="flex-shrink-0"><Icon name={icons.Settings} className="w-[18px] h-[18px]" /></span>
            {!collapsed && <span>{isZh ? '账户设置' : 'Settings'}</span>}
          </Link>

          {/* User card */}
          <div className={`flex items-center gap-2 mt-2 ${collapsed ? 'justify-center' : ''}`}>
            <Link
              href={`/${locale}/profile`}
              className="flex-shrink-0"
              title={collapsed ? `${displayName} (@${me.username})` : undefined}
            >
              <Avatar className="h-9 w-9">
                <AvatarImage src={me.avatar ?? undefined} />
                <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </Link>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{displayName}</div>
                <div className="flex items-center gap-1">
                  {me.membership && me.membership.status === 'ACTIVE' ? (
                    <Badge variant={membershipVariant} className="text-xs">
                      {membershipLabel}
                    </Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground">@{me.username}</span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Collapse button — uses ChevronLeft/Right directly from lucide (no wrapper needed) */}
      <div className={`p-3 border-t border-border ${collapsed ? 'flex justify-center' : ''}`}>
        <button
          onClick={() => {
            const next = !collapsed;
            setCollapsed(next);
            localStorage.setItem('sidebar-collapsed', String(next));
          }}
          className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground h-10 w-10 flex-shrink-0"
          title={isZh ? (collapsed ? '展开' : '收起') : (collapsed ? 'Expand' : 'Collapse')}
        >
          {collapsed
            ? <Icon name={icons.ChevronRight} size={16} />
            : <><Icon name={icons.ChevronLeft} size={16} /><span className="text-xs">{isZh ? '收起' : 'Collapse'}</span></>
          }
        </button>
      </div>
    </aside>
  );
}
