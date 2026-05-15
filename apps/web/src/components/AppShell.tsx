'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

const NAV_ITEMS = [
  { href: '/home', label: '首页', icon: '🏠' },
  { href: '/watchlist', label: '自选', icon: '⭐' },
  { href: '/strategies', label: '策略广场', icon: '📊' },
  { href: '/strategies/new', label: '发布策略', icon: '✍️' },
  { href: '/membership', label: '会员中心', icon: '👑' },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { me, loading, logout } = useAuth(false);

  return (
    <div className="flex h-screen bg-slate-900 text-white">
      {/* 固定侧边栏 */}
      <aside className="w-56 flex flex-col border-r border-slate-700 flex-shrink-0">
        {/* Logo */}
        <div className="px-4 py-5 border-b border-slate-700">
          <span className="text-lg font-bold text-white">GPAIAgent</span>
          <div className="text-xs text-slate-400 mt-0.5">短线炒股辅助平台</div>
        </div>

        {/* 导航 */}
        <nav className="flex-1 overflow-y-auto py-3">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href || (item.href !== '/home' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg text-sm transition-colors mb-0.5 ${
                  active
                    ? 'bg-blue-600 text-white font-medium'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* 用户信息 */}
        <div className="p-4 border-t border-slate-700">
          {loading ? (
            <div className="text-xs text-slate-400">加载中...</div>
          ) : me ? (
            <div className="flex items-center justify-between">
              <div className="text-sm truncate">
                <div className="truncate text-white font-medium">{me.username}</div>
                <div className="truncate text-xs text-slate-400">已登录</div>
              </div>
              <button
                onClick={logout}
                className="text-xs text-slate-400 hover:text-white ml-2 flex-shrink-0"
              >
                退出
              </button>
            </div>
          ) : (
            <div className="text-xs text-slate-400">未登录</div>
          )}
        </div>
      </aside>

      {/* 右侧主区域 */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* 顶部栏 */}
        <header className="h-14 flex items-center justify-between px-6 border-b border-slate-700 flex-shrink-0 bg-slate-900/80">
          <div className="text-sm text-slate-300">
            {NAV_ITEMS.find((item) => pathname === item.href || (item.href !== '/home' && pathname.startsWith(item.href)))?.label ?? 'GPAIAgent'}
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="text-green-400">●</span>
            <span>实时行情</span>
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
