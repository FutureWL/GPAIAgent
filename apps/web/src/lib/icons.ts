/**
 * Centralized lucide-react icon registry for GPAIAgent.
 *
 * Why: Avoid scattered `import { X } from 'lucide-react'` across files.
 * Switching icon library requires changing only this file and Icon.tsx.
 *
 * Usage:
 *   import { Icon, icons } from '@/components/ui/icon';
 *   <Icon name={icons.TrendingUp} />
 *   // or string directly: <Icon name="TrendingUp" />
 *
 * NOTE: Some icon names differ between lucide-react versions.
 * Always verify with: node -e "const {icons}=require('lucide-react');console.log('Name:',name in icons)"
 */

import { icons as _icons } from 'lucide-react';

// All icons currently used in the project — one source of truth.
// Adding a new icon: import here and use via Icon component.
export const icons = {
  // Navigation / UI
  TrendingUp: 'TrendingUp',
  LayoutDashboard: 'LayoutDashboard',
  Globe: 'Globe',
  Sun: 'Sun',
  Moon: 'Moon',
  Monitor: 'Monitor',
  ChevronLeft: 'ChevronLeft',
  ChevronRight: 'ChevronRight',
  ChevronDown: 'ChevronDown',
  ChevronUp: 'ChevronUp',

  // Actions
  Eye: 'Eye',
  EyeOff: 'EyeOff',
  LogOut: 'LogOut',
  LogIn: 'LogIn',
  Settings: 'Settings',
  RefreshCw: 'RefreshCw',
  Loader: 'Loader',               // lucide name (v2 rename from Loader2)
  Trash2: 'Trash2',
  Filter: 'Filter',

  // Feedback / Status
  Check: 'Check',
  Circle: 'Circle',
  CheckCircle: 'CircleCheck',     // lucide v2 rename
  XCircle: 'CircleX',             // lucide v2 rename
  AlertCircle: 'CircleAlert',     // lucide v2 rename

  // User / Identity
  User: 'User',
  Users: 'Users',
  UserCheck: 'UserCheck',
  UserX: 'UserX',
  ShieldCheck: 'ShieldCheck',

  // Content
  FileText: 'FileText',
  Newspaper: 'Newspaper',
  MessageSquare: 'MessageSquare',

  // Market / Stocks
  Star: 'Star',
  ChartLine: 'ChartLine',
  ChartBarBig: 'ChartBarBig',
  Crown: 'Crown',
  CreditCard: 'CreditCard',
  Database: 'Database',
  Search: 'Search',

  // AI / Misc
  BotMessageSquare: 'BotMessageSquare',
  Sparkles: 'Sparkles',
  Zap: 'Zap',
  ArrowRight: 'ArrowRight',
  Clock: 'Clock',
} as const;

export type IconName = (typeof icons)[keyof typeof icons];
