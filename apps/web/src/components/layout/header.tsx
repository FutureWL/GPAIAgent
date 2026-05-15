'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Globe, LayoutDashboard } from 'lucide-react';
import { UserOutlined, LogoutOutlined, DashboardOutlined } from '@ant-design/icons';
import { Button } from '@/components/ui/button';
import { Avatar, Dropdown } from 'antd';
import type { MenuProps } from 'antd';

interface HeaderProps {
  locale: 'zh' | 'en';
  username?: string;
}

export default function Header({ locale, username }: HeaderProps) {
  const pathname = usePathname();
  const router = useRouter();

  const switchLocale = (newLocale: string) => {
    const newPath = pathname.replace(/^\/(zh|en)/, `/${newLocale}`);
    window.location.href = newPath;
  };

  const handleLogout = () => {
    document.cookie = 'gpai_access_token=; Max-Age=0; path=/';
    router.push(`/${locale}/login`);
    router.refresh();
  };

  const userMenuItems: MenuProps['items'] = [
    {
      key: 'username',
      label: (
        <div className="text-sm font-medium py-1">
          {username}
        </div>
      ),
      disabled: true,
    },
    { type: 'divider' },
    {
      key: 'admin',
      icon: <DashboardOutlined />,
      label: <Link href={`/${locale}/admin`}>管理后台</Link>,
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: handleLogout,
    },
  ];

  return (
    <header className="h-14 flex items-center justify-between px-6 border-b bg-card flex-shrink-0">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-muted-foreground">
          {locale === 'zh' ? '导航' : 'Navigation'}
        </span>
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
            variant="ghost"
            size="sm"
            onClick={() => switchLocale('zh')}
            className={`h-7 px-2 text-xs ${locale === 'zh' ? 'bg-primary/10 text-primary' : 'text-muted-foreground'}`}
          >
            <Globe className="w-3 h-3 mr-1" />
            中文
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => switchLocale('en')}
            className={`h-7 px-2 text-xs ${locale === 'en' ? 'bg-primary/10 text-primary' : 'text-muted-foreground'}`}
          >
            <Globe className="w-3 h-3 mr-1" />
            EN
          </Button>
        </div>

        {/* User dropdown — only shown when logged in */}
        {username && (
          <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
            <Avatar
              icon={<UserOutlined />}
              className="cursor-pointer bg-primary/20 text-primary"
            />
          </Dropdown>
        )}
      </div>
    </header>
  );
}
