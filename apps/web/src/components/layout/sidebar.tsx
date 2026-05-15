'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Avatar, Tag, Tooltip } from 'antd';
import {
  LayoutDashboard,
  FileText,
  Star,
  LineChart,
  BarChart2,
  Crown,
  ChevronLeft,
  ChevronRight,
  Settings,
  User as UserSwitch,
} from 'lucide-react';

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

const navItems = (locale: string) => [
  { key: 'home', label: locale === 'zh' ? '首页' : 'Home', href: `/${locale}/home`, icon: <LayoutDashboard size={18} /> },
  { key: 'blog', label: locale === 'zh' ? '博客' : 'Blog', href: `/${locale}/blog`, icon: <FileText size={18} /> },
  { key: 'watchlist', label: locale === 'zh' ? '自选股' : 'Watchlist', href: `/${locale}/watchlist`, icon: <Star size={18} /> },
  { key: 'market', label: locale === 'zh' ? '行情' : 'Market', href: `/${locale}/market`, icon: <LineChart size={18} /> },
  { key: 'strategies', label: locale === 'zh' ? '策略广场' : 'Strategies', href: `/${locale}/strategies`, icon: <BarChart2 size={18} /> },
  { key: 'membership', label: locale === 'zh' ? '会员中心' : 'Membership', href: `/${locale}/membership`, icon: <Crown size={18} /> },
];

const MEMBERSHIP_COLORS: Record<string, string> = { NORMAL: 'gold', PRIVATE: 'purple' };
const MEMBERSHIP_LABELS: Record<string, string> = { NORMAL: '普通会员', PRIVATE: '私人会员' };

export default function Sidebar({ locale, me }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');
  const displayName = me?.name || me?.username || '';
  const initials = displayName.slice(0, 1).toUpperCase();

  return (
    <aside className="flex flex-col h-full border-r bg-card transition-all duration-200"
      style={{ width: collapsed ? 64 : 224 }}>
      {/* Logo */}
      <div className="flex items-center justify-between px-3 py-4 border-b border-border">
        {!collapsed && (
          <div>
            <div className="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
                fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                strokeLinejoin="round" className="lucide lucide-trending-up w-5 h-5 text-primary">
                <path d="M16 7h6v6" /><path d="m22 7-8.5 8.5-5-5L2 17" />
              </svg>
              <span className="font-bold text-lg">GPAIAgent</span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {locale === 'zh' ? '短线炒股辅助平台' : 'Stock Trading Assistant'}
            </p>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground h-10 w-10 flex-shrink-0"
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2">
        {navItems(locale).map((item) => (
          <Link
            key={item.key}
            href={item.href}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors mb-0.5 ${
              isActive(item.href)
                ? 'bg-primary/10 text-primary font-medium'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            }`}
          >
            <span className="flex-shrink-0">{item.icon}</span>
            {!collapsed && <span>{item.label}</span>}
          </Link>
        ))}

        {/* 底部用户区域 */}
        {me && (
          <>
            <div className="border-t border-border my-3" />
            <div className="px-2 space-y-1">
              <Link
                href={`/${locale}/profile`}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  isActive(`/${locale}/profile`)
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                }`}
              >
                <UserSwitch size={18} className="flex-shrink-0" />
                {!collapsed && <span>{locale === 'zh' ? '个人主页' : 'Profile'}</span>}
              </Link>
              <Link
                href={`/${locale}/settings`}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  isActive(`/${locale}/settings`)
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                }`}
              >
                <Settings size={18} className="flex-shrink-0" />
                {!collapsed && <span>{locale === 'zh' ? '账户设置' : 'Settings'}</span>}
              </Link>
            </div>
          </>
        )}
      </nav>

      {/* Bottom user section */}
      <div className="p-3 border-t border-border">
        {me ? (
          <div className={`flex items-center gap-2 ${collapsed ? 'justify-center' : ''}`}>
            <Tooltip title={collapsed ? `${displayName} (@${me.username})` : undefined}>
              <Link href={`/${locale}/profile`} className="flex-shrink-0">
                <Avatar
                  size={36}
                  src={me.avatar}
                  style={{ backgroundColor: '#1677ff' }}
                >
                  {initials}
                </Avatar>
              </Link>
            </Tooltip>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{displayName}</div>
                <div className="flex items-center gap-1">
                  {me.membership && me.membership.status === 'ACTIVE' ? (
                    <Tag
                      color={MEMBERSHIP_COLORS[me.membership.level]}
                      className="text-xs m-0 leading-none"
                    >
                      {MEMBERSHIP_LABELS[me.membership.level]}
                    </Tag>
                  ) : (
                    <span className="text-xs text-muted-foreground">@{me.username}</span>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : !collapsed && (
          <div className="text-xs text-muted-foreground text-center py-1">
            {locale === 'zh' ? '登录后享受更多功能' : 'Sign in for more features'}
          </div>
        )}
      </div>
    </aside>
  );
}
