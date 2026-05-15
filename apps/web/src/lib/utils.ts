import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDistanceToNow(
  date: Date,
  options?: { locale?: string }
): string {
  const locale = options?.locale || 'zh-CN';
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  const rtf = new Intl.RelativeTimeFormat(locale === 'en' ? 'en' : 'zh-CN', {
    numeric: 'auto',
  });

  if (diffDay >= 30) {
    return new Intl.DateTimeFormat(locale === 'en' ? 'en-US' : 'zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date);
  } else if (diffDay >= 1) {
    return rtf.format(-diffDay, 'day');
  } else if (diffHour >= 1) {
    return rtf.format(-diffHour, 'hour');
  } else if (diffMin >= 1) {
    return rtf.format(-diffMin, 'minute');
  } else {
    return rtf.format(-diffSec, 'second');
  }
}
