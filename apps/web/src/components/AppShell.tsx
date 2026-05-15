'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/home', label: '首页', icon: '🏠' },
  { href: '/blog', label: '博客', icon: '📝' },
  { href: '/watchlist', label: '自选', icon: '⭐' },
  { href: '/market', label: '行情', icon: '📈' },
  { href: '/strategies', label: '策略广场', icon: '📊' },
  { href: '/strategies/new', label: '发布策略', icon: '✍️' },
  { href: '/membership', label: '会员中心', icon: '👑' },
];

type AppShellProps = {
  children: React.ReactNode;
  username?: string;
};

export default function AppShell({ children, username }: AppShellProps) {
  const pathname = usePathname();

  return (
    <div className="flex h-screen bg-slate-900 text-white">
      {/* 侧边栏 */}
      <aside className="w-56 flex flex-col border-r border-slate-700 flex-shrink-0">
        <div className="px-4 py-5 border-b border-slate-700">
          <span className="text-lg font-bold text-white">GPAIAgent</span>
          <div className="text-xs text-slate-400 mt-0.5">短线炒股辅助平台</div>
        </div>

        <nav className="flex-1 overflow-y-auto py-3">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg text-sm transition-colors mb-0.5 ${
                  isActive
                    ? 'bg-slate-700 text-white'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-700">
          {username ? (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-sm">
                {username[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium truncate">{username}</div>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <Link
                href="/login"
                className="flex-1 text-center px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded text-xs transition-colors"
              >
                登录
              </Link>
              <Link
                href="/register"
                className="flex-1 text-center px-3 py-1.5 border border-slate-600 hover:border-slate-500 rounded text-xs transition-colors"
              >
                注册
              </Link>
            </div>
          )}
        </div>
      </aside>

      {/* 主内容区 */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* 顶部栏 */}
        <header className="h-14 flex items-center justify-between px-6 border-b border-slate-700 flex-shrink-0 bg-slate-900/80">
          <div className="text-sm text-slate-300">GPAIAgent</div>
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
