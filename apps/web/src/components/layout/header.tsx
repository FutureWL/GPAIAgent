'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Globe } from 'lucide-react';
import {
  Avatar,
  Dropdown,
  Tag,
  Badge,
  Button,
} from 'antd';
import type { MenuProps } from 'antd';
import {
  UserOutlined,
  LogoutOutlined,
  DashboardOutlined,
  SettingOutlined,
} from '@ant-design/icons';

interface User {
  id: string;
  username: string;
  name?: string | null;
  avatar?: string | null;
  email?: string | null;
  membership?: {
    level: string;
    type: string;
    status: string;
    expiredAt: string;
  } | null;
}

interface HeaderProps {
  locale: 'zh' | 'en';
  me?: User | null;
}

const MEMBERSHIP_COLORS: Record<string, string> = { NORMAL: 'gold', PRIVATE: 'purple' };
const MEMBERSHIP_LABELS: Record<string, string> = { NORMAL: '普通会员', PRIVATE: '私人会员' };

export default function Header({ locale, me }: HeaderProps) {
  const pathname = usePathname();
  const router = useRouter();

  const switchLocale = (newLocale: string) => {
    const newPath = pathname.replace(/^\/(zh|en)/, `/${newLocale}`);
    window.location.href = newPath;
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    } catch {
      // ignore
    }
    document.cookie = 'gpai_access_token=; Max-Age=0; path=/';
    document.cookie = 'access_token=; Max-Age=0; path=/';
    router.push(`/${locale}/login`);
    router.refresh();
  };

  const displayName = me?.name || me?.username || '';
  const initials = displayName.slice(0, 1).toUpperCase();

  const userCardLabel = (
    <div className="w-72 p-0 overflow-hidden rounded-lg border border-gray-100 shadow-lg">
      <div className="h-20 bg-gradient-to-r from-blue-600 to-indigo-600 relative">
        <div className="absolute -bottom-8 left-4">
          <Badge
            offset={[-2, 2]}
            count={
              me?.membership && me.membership.status === 'ACTIVE' ? (
                <Tag
                  color={MEMBERSHIP_COLORS[me.membership.level]}
                  className="text-xs border-0 leading-none"
                  style={{ fontSize: 10, padding: '0 4px' }}
                >
                  {MEMBERSHIP_LABELS[me.membership.level]}
                </Tag>
              ) : null
            }
          >
            <Avatar
              size={56}
              src={me?.avatar}
              style={{ backgroundColor: 'rgba(255,255,255,0.25)', border: '2px solid white', fontSize: 22 }}
            >
              {initials}
            </Avatar>
          </Badge>
        </div>
      </div>
      <div className="pt-10 pb-3 px-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-semibold text-gray-900">{displayName}</div>
            <div className="text-xs text-gray-400">@{me?.username}</div>
          </div>
            <Link href={`/${locale}/settings`} onClick={(e) => e.stopPropagation()}>
              <Button size="small" icon={<SettingOutlined />}>
                编辑
              </Button>
            </Link>
        </div>
        {me?.membership && me.membership.status === 'ACTIVE' && (
          <div className="mt-2 flex items-center gap-2">
            <Tag color={me.membership.status === 'ACTIVE' ? 'green' : 'default'} className="text-xs">
              {me.membership.status === 'ACTIVE' ? '会员有效' : '已过期'}
            </Tag>
            <span className="text-xs text-gray-400">
              到期：{new Date(me.membership.expiredAt).toLocaleDateString('zh-CN')}
            </span>
          </div>
        )}
      </div>
    </div>
  );

  const userMenuItems: MenuProps['items'] = [
    {
      key: 'card',
      label: userCardLabel,
      disabled: true,
    },
    { type: 'divider' },
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: <Link href={`/${locale}/profile`}>个人主页</Link>,
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: <Link href={`/${locale}/settings`}>账户设置</Link>,
    },
    {
      key: 'admin',
      icon: <DashboardOutlined />,
      label: <Link href={`/${locale}/admin`}>管理后台</Link>,
    },
    { type: 'divider' },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: handleLogout,
    },
  ];

  return (
    <header className="h-14 flex items-center justify-between px-6 border-b bg-card flex-shrink-0">
      <div className="flex items-center gap-3">
        {/* Logo */}
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
          fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
          strokeLinejoin="round" className="lucide lucide-trending-up w-5 h-5 text-primary">
          <path d="M16 7h6v6" /><path d="m22 7-8.5 8.5-5-5L2 17" />
        </svg>
        <span className="font-bold text-base">GPAIAgent</span>
      </div>

      <div className="flex items-center gap-4">
        {/* Live indicator */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
          </span>
          <span>{locale === 'zh' ? '实时行情' : 'Live Market'}</span>
        </div>

        {/* Language switcher */}
        <div className="flex items-center gap-1 border rounded-md p-0.5">
          <Button
            type="text"
            size="small"
            onClick={() => switchLocale('zh')}
            className={`h-7 px-2 text-xs ${locale === 'zh' ? 'bg-primary/10 text-primary' : 'text-muted-foreground'}`}
          >
            <Globe className="w-3 h-3 mr-1" />
            中文
          </Button>
          <Button
            type="text"
            size="small"
            onClick={() => switchLocale('en')}
            className={`h-7 px-2 text-xs ${locale === 'en' ? 'bg-primary/10 text-primary' : 'text-muted-foreground'}`}
          >
            <Globe className="w-3 h-3 mr-1" />
            EN
          </Button>
        </div>

        {/* User dropdown */}
        {me ? (
          <Dropdown menu={{ items: userMenuItems }} placement="bottomRight" trigger={['click']}>
            <button className="flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer">
              <Avatar size={32} src={me.avatar} style={{ backgroundColor: '#1677ff' }}>
                {initials}
              </Avatar>
              <span className="text-sm font-medium text-gray-700 hidden sm:block">{displayName}</span>
            </button>
          </Dropdown>
        ) : null}
      </div>
    </header>
  );
}
