import Sidebar from './sidebar';
import Header from './header';
import StockTicker from '@/components/stocks/stock-ticker';

interface User {
  id: string;
  username: string;
  name?: string | null;
  avatar?: string | null;
  email?: string | null;
  bio?: string | null;
  membership?: {
    level: string;
    type: string;
    status: string;
    expiredAt: string;
  } | null;
}

interface AppShellProps {
  children: React.ReactNode;
  me?: User | null;
  locale?: string;
}

export default function AppShell({ children, me, locale = 'zh' }: AppShellProps) {
  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar: z-20, 左侧导航（层次高于顶部导航栏） */}
      <div className="relative z-20 flex-shrink-0">
        <Sidebar locale={locale as 'zh' | 'en'} me={me} />
      </div>
      {/* 主内容区 */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* 顶部行情 ticker: z-30（在 Header 之上滚动，不被遮盖） */}
        <div className="relative z-30">
          <StockTicker />
        </div>
        {/* 顶部导航栏: z-20 */}
        <div className="relative z-20">
          <Header locale={locale as 'zh' | 'en'} me={me} />
        </div>
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
