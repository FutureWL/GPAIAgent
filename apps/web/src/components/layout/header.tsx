'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { Icon, icons } from '@/components/ui/icon';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

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

const MEMBERSHIP_LABELS_ZH: Record<string, string> = { NORMAL: '普通会员', PRIVATE: '私人会员' };
const MEMBERSHIP_LABELS_EN: Record<string, string> = { NORMAL: 'Normal', PRIVATE: 'Private' };
const MEMBERSHIP_BADGE_VARIANTS: Record<string, 'default' | 'secondary'> = {
  NORMAL: 'default',
  PRIVATE: 'secondary',
};

const THEME_OPTIONS = [
  { key: 'light', labelZh: '亮色', labelEn: 'Light', iconName: 'Sun' as const },
  { key: 'dark', labelZh: '暗色', labelEn: 'Dark', iconName: 'Moon' as const },
  { key: 'system', labelZh: '跟随系统', labelEn: 'System', iconName: 'Monitor' as const },
];

export default function Header({ locale, me }: HeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme } = useTheme();

  const switchLocale = (newLocale: string) => {
    const newPath = pathname.replace(/^\/(zh|en)/, `/${newLocale}`);
    router.replace(newPath);
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
  const isZh = locale === 'zh';
  const membershipLabel = isZh
    ? MEMBERSHIP_LABELS_ZH[me?.membership?.level ?? ''] ?? ''
    : MEMBERSHIP_LABELS_EN[me?.membership?.level ?? ''] ?? '';
  const membershipVariant = MEMBERSHIP_BADGE_VARIANTS[me?.membership?.level ?? ''] ?? 'default';

  return (
    <header className="h-14 flex items-center justify-between px-6 border-b bg-card flex-shrink-0">
      <div className="flex items-center gap-3">
        {/* Logo — inline SVG preserved for precise stroke control */}
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
          <span>{isZh ? '实时行情' : 'Live Market'}</span>
        </div>

        {/* Language switcher */}
        <div className="flex items-center gap-1 border rounded-md p-0.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => switchLocale('zh')}
            className={`h-7 px-2 text-xs ${locale === 'zh' ? 'bg-primary/10 text-primary' : 'text-muted-foreground'}`}
          >
            <Icon name={icons.Globe} className="w-3 h-3 mr-1" />
            中文
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => switchLocale('en')}
            className={`h-7 px-2 text-xs ${locale === 'en' ? 'bg-primary/10 text-primary' : 'text-muted-foreground'}`}
          >
            <Icon name={icons.Globe} className="w-3 h-3 mr-1" />
            EN
          </Button>
        </div>

        {/* Theme switcher */}
        <div className="flex items-center gap-1 border rounded-md p-0.5">
          {THEME_OPTIONS.map((opt) => {
            const label = isZh ? opt.labelZh : opt.labelEn;
            return (
              <Button
                key={opt.key}
                variant="ghost"
                size="sm"
                title={label}
                onClick={() => setTheme(opt.key)}
                className={`h-7 w-8 p-0 flex items-center justify-center ${theme === opt.key ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'}`}
              >
                <Icon name={opt.iconName} className="w-3.5 h-3.5" />
              </Button>
            );
          })}
        </div>

        {/* User dropdown */}
        {me ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={me.avatar ?? undefined} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium text-foreground hidden sm:block">{displayName}</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72 p-0">
              {/* User card */}
              <DropdownMenuLabel className="p-0">
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-t-md p-4 pb-8">
                  <div className="flex items-end gap-3">
                    <Avatar className="h-14 w-14 border-2 border-white">
                      <AvatarImage src={me.avatar ?? undefined} />
                      <AvatarFallback className="bg-white/25 text-white text-lg">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0 pb-1">
                      <div className="text-white font-semibold">{displayName}</div>
                      <div className="text-white/70 text-xs">@{me.username}</div>
                    </div>
                    {me.membership && me.membership.status === 'ACTIVE' && (
                      <Badge variant={membershipVariant} className="mb-1 bg-white/20 text-white border-0">
                        {membershipLabel}
                      </Badge>
                    )}
                  </div>
                </div>
              </DropdownMenuLabel>

              <div className="px-4 py-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {me.membership && me.membership.status === 'ACTIVE' && (
                      <Badge variant={me.membership.status === 'ACTIVE' ? 'default' : 'outline'} className="bg-green-500/10 text-green-600 border-green-200">
                        {isZh ? '会员有效' : 'Active'}
                      </Badge>
                    )}
                    {me.membership && (
                      <span className="text-xs text-muted-foreground">
                        {isZh ? '到期：' : 'Exp: '}{new Date(me.membership.expiredAt).toLocaleDateString(isZh ? 'zh-CN' : 'en-US')}
                      </span>
                    )}
                  </div>
                  <Button variant="ghost" size="sm" className="h-7 text-xs" asChild>
                    <Link href={`/${locale}/settings`}>
                      <Icon name={icons.Settings} className="w-3 h-3 mr-1" />
                      {isZh ? '编辑' : 'Edit'}
                    </Link>
                  </Button>
                </div>
              </div>

              <DropdownMenuSeparator />

              <DropdownMenuItem asChild>
                <Link href={`/${locale}/profile`} className="flex items-center gap-2 cursor-pointer">
                  <Icon name={icons.User} className="w-4 h-4" />
                  {isZh ? '个人主页' : 'Profile'}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/${locale}/settings`} className="flex items-center gap-2 cursor-pointer">
                  <Icon name={icons.Settings} className="w-4 h-4" />
                  {isZh ? '账户设置' : 'Settings'}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/${locale}/admin`} className="flex items-center gap-2 cursor-pointer">
                  <Icon name={icons.LayoutDashboard} className="w-4 h-4" />
                  {isZh ? '管理后台' : 'Admin'}
                </Link>
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive cursor-pointer">
                <Icon name={icons.LogOut} className="w-4 h-4 mr-2" />
                {isZh ? '退出登录' : 'Sign Out'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>
    </header>
  );
}
