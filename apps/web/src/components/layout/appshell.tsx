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
      <Sidebar locale={locale as 'zh' | 'en'} me={me} />
      <div className="flex-1 flex flex-col min-w-0">
        <StockTicker />
        <Header locale={locale as 'zh' | 'en'} me={me} />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
