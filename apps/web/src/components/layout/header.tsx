'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Globe, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface HeaderProps {
  locale: 'zh' | 'en';
}

export default function Header({ locale }: HeaderProps) {
  const pathname = usePathname();

  const switchLocale = (newLocale: string) => {
    const newPath = pathname.replace(/^\/(zh|en)/, `/${newLocale}`);
    window.location.href = newPath;
  };

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
      </div>
    </header>
  );
}
