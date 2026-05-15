import Sidebar from './sidebar';
import Header from './header';

interface AppShellProps {
  children: React.ReactNode;
  username?: string;
  locale?: string;
}

export default function AppShell({ children, username, locale = 'zh' }: AppShellProps) {
  return (
    <div className="flex h-screen bg-background">
      <Sidebar locale={locale as 'zh' | 'en'} username={username} />
      <div className="flex-1 flex flex-col min-w-0">
        <Header locale={locale as 'zh' | 'en'} />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
