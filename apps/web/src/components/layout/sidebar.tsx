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
  Search,
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
  { key: 'stock-screen', label: locale === 'zh' ? '选股' : 'Stock Screen', href: `/${locale}/stock-screen`, icon: <Search size={18} /> },
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

      {/* Nav — Logo 已移至顶部导航栏 */}
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

        {/* 登录前底部提示 */}
        {!me && !collapsed && (
          <div className="mt-4 px-3 text-xs text-muted-foreground text-center py-2">
            {locale === 'zh' ? '登录后享受更多功能' : 'Sign in for more features'}
          </div>
        )}
      </nav>

      {/* 用户区域（位于导航和折叠按钮之间） */}
      {me && (
        <div className="px-2 py-3 border-t border-border">
          <Link
            href={`/${locale}/profile`}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors mb-1 ${
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

          {/* 用户卡片 */}
          <div className={`flex items-center gap-2 mt-2 ${collapsed ? 'justify-center' : ''}`}>
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
        </div>
      )}

      {/* 折叠按钮 — 移到最底部 */}
      <div className={`p-3 border-t border-border ${collapsed ? 'flex justify-center' : ''}`}>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground h-10 w-10 flex-shrink-0"
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          {!collapsed && <span className="text-xs">{locale === 'zh' ? '收起' : 'Collapse'}</span>}
        </button>
      </div>
    </aside>
  );
}
