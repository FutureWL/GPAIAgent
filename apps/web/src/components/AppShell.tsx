'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

const NAV_ITEMS_ZH = [
  { href: '/home', label: '首页', icon: '🏠' },
  { href: '/blog', label: '博客', icon: '📝' },
  { href: '/watchlist', label: '自选', icon: '⭐' },
  { href: '/market', label: '行情', icon: '📈' },
  { href: '/strategies', label: '策略广场', icon: '📊' },
  { href: '/strategies/new', label: '发布策略', icon: '✍️' },
  { href: '/membership', label: '会员中心', icon: '👑' },
];

const NAV_ITEMS_EN = [
  { href: '/home', label: 'Home', icon: '🏠' },
  { href: '/blog', label: 'Blog', icon: '📝' },
  { href: '/watchlist', label: 'Watchlist', icon: '⭐' },
  { href: '/market', label: 'Market', icon: '📈' },
  { href: '/strategies', label: 'Strategies', icon: '📊' },
  { href: '/strategies/new', label: 'Publish', icon: '✍️' },
  { href: '/membership', label: 'Membership', icon: '👑' },
];

type AppShellProps = {
  children: React.ReactNode;
  username?: string;
  locale?: string;
};

export default function AppShell({ children, username, locale = 'zh' }: AppShellProps) {
  const pathname = usePathname();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const navItems = locale === 'en' ? NAV_ITEMS_EN : NAV_ITEMS_ZH;

  return (
    <div className="flex h-screen bg-slate-900 text-white">
      {/* 侧边栏 */}
      <aside
        className={`flex flex-col border-r border-slate-700 flex-shrink-0 transition-all duration-200 ${
          sidebarCollapsed ? 'w-16' : 'w-56'
        }`}
      >
        {/* Logo 区域 */}
        <div className="px-4 py-5 border-b border-slate-700 flex items-center justify-between">
          {!sidebarCollapsed && (
            <div>
              <span className="text-lg font-bold text-white">GPAIAgent</span>
              <div className="text-xs text-slate-400 mt-0.5">
                {locale === 'en' ? 'Trading Assistant' : '短线炒股辅助平台'}
              </div>
            </div>
          )}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="text-slate-400 hover:text-white transition-colors p-1"
            title={locale === 'en' ? 'Toggle sidebar' : '折叠侧边栏'}
          >
            {sidebarCollapsed ? '→' : '←'}
          </button>
        </div>

        {/* 导航 */}
        <nav className="flex-1 overflow-y-auto py-3">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg text-sm transition-colors mb-0.5 ${
                  isActive
                    ? 'bg-slate-700 text-white'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                } ${sidebarCollapsed ? 'justify-center px-0' : ''}`}
                title={sidebarCollapsed ? item.label : undefined}
              >
                <span>{item.icon}</span>
                {!sidebarCollapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* 用户区域 */}
        <div className="p-4 border-t border-slate-700">
          {username ? (
            <div className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'gap-2'}`}>
              <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-sm flex-shrink-0">
                {username[0].toUpperCase()}
              </div>
              {!sidebarCollapsed && (
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium truncate">{username}</div>
                </div>
              )}
            </div>
          ) : (
            <div className={`flex gap-2 ${sidebarCollapsed ? 'flex-col items-center' : ''}`}>
              <Link
                href="/login"
                className={`bg-blue-600 hover:bg-blue-700 rounded text-xs transition-colors text-center ${
                  sidebarCollapsed ? 'px-2 py-1.5' : 'flex-1 px-3 py-1.5'
                }`}
              >
                {locale === 'en' ? 'Login' : '登录'}
              </Link>
              {!sidebarCollapsed && (
                <Link
                  href="/register"
                  className="flex-1 text-center px-3 py-1.5 border border-slate-600 hover:border-slate-500 rounded text-xs transition-colors"
                >
                  {locale === 'en' ? 'Register' : '注册'}
                </Link>
              )}
            </div>
          )}
        </div>
      </aside>

      {/* 主内容区 */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* 顶部栏 */}
        <header className="h-14 flex items-center justify-between px-6 border-b border-slate-700 flex-shrink-0 bg-slate-900/80">
          <div className="text-sm text-slate-300">GPAIAgent</div>
          <div className="flex items-center gap-4">
            {/* 语言切换 */}
            <div className="flex gap-1 text-xs">
              <Link
                href={pathname.replace(/^\/(zh|en)/, '/zh')}
                className={`px-2 py-0.5 rounded ${locale === 'zh' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                中文
              </Link>
              <Link
                href={pathname.replace(/^\/(zh|en)/, '/en')}
                className={`px-2 py-0.5 rounded ${locale === 'en' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                EN
              </Link>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="text-green-400">●</span>
              <span>{locale === 'en' ? 'Live' : '实时行情'}</span>
            </div>
          </div>
        </header>

        {/* 页面内容 */}
        <main className="flex-1 overflow-y-auto p-6 bg-slate-800/30">
          {children}
        </main>
      </div>
    </div>
  );
}
