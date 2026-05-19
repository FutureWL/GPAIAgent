"use client";

import React, { useEffect, useState } from 'react';
import {
  Users,
  FileText,
  CreditCard,
  TrendingUp,
  BotMessageSquare,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { Icon, icons } from '@/components/ui/icon';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Stats {
  userCount: number;
  postCount: number;
  strategyCount: number;
  pendingPosts: number;
  pendingStrategies: number;
  stockCount: number;
  syncQueuePending: number;
  syncJobsRecent: number;
}

async function fetchStats(): Promise<Stats | null> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/stats`, {
      credentials: 'include',
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function fetchSyncStatus(): Promise<{ inQueue: number; recentJobs: number } | null> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/sync/status`, {
      credentials: 'include',
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats().then((data) => {
      setStats(data);
      setLoading(false);
    });
  }, []);

  const cards = [
    {
      title: '用户总数',
      value: stats?.userCount ?? '-',
      icon: Users,
      color: 'text-blue-600',
      bg: 'bg-blue-50 dark:bg-blue-950',
    },
    {
      title: '博客文章',
      value: stats?.postCount ?? '-',
      icon: FileText,
      color: 'text-green-600 dark:text-green-400',
      bg: 'bg-green-50 dark:bg-green-950',
    },
    {
      title: '待审帖子',
      value: stats?.pendingPosts ?? '-',
      icon: AlertCircle,
      color: 'text-orange-600 dark:text-orange-400',
      bg: 'bg-orange-50 dark:bg-orange-950',
    },
    {
      title: '策略数',
      value: stats?.strategyCount ?? '-',
      icon: TrendingUp,
      color: 'text-purple-600 dark:text-purple-400',
      bg: 'bg-purple-50 dark:bg-purple-950',
    },
    {
      title: '待审策略',
      value: stats?.pendingStrategies ?? '-',
      icon: Clock,
      color: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-50 dark:bg-amber-950',
    },
    {
      title: '股票数',
      value: stats?.stockCount ?? '-',
      icon: TrendingUp,
      color: 'text-red-600 dark:text-red-400',
      bg: 'bg-red-50 dark:bg-red-950',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">管理后台</h1>
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.title}
              </CardTitle>
              <div className={`p-2 rounded-lg ${card.bg}`}>
                <card.icon className={`h-4 w-4 ${card.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? '...' : card.value}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Sync status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium">数据同步状态</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground text-sm">加载中...</p>
          ) : stats ? (
            <div className="grid gap-3 md:grid-cols-2">
              <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">队列待处理</p>
                  <p className="text-2xl font-bold">{stats.syncQueuePending}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card">
                  <Icon name={icons.CheckCircle} className="w-4 h-4 text-green-500" />
                <div>
                  <p className="text-sm font-medium">近 24h 同步任务</p>
                  <p className="text-2xl font-bold">{stats.syncJobsRecent}</p>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-destructive text-sm">无法加载数据，请检查 API 连接</p>
          )}
        </CardContent>
      </Card>

      {/* Quick nav */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium">快捷操作</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 md:grid-cols-3">
            <a
              href="/zh/admin/users"
              className="flex items-center gap-2 p-3 rounded-lg border border-border hover:bg-accent transition-colors text-sm"
            >
              <Users className="h-4 w-4 text-muted-foreground" />
              用户管理
            </a>
            <a
              href="/zh/admin/posts"
              className="flex items-center gap-2 p-3 rounded-lg border border-border hover:bg-accent transition-colors text-sm"
            >
              <Icon name={icons.FileText} className="h-4 w-4 text-muted-foreground" />
              博客审核
              {stats && stats.pendingPosts > 0 && (
                <span className="ml-auto bg-orange-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">
                  {stats.pendingPosts}
                </span>
              )}
            </a>
            <a
              href="/zh/admin/stocks"
              className="flex items-center gap-2 p-3 rounded-lg border border-border hover:bg-accent transition-colors text-sm"
            >
              <Icon name={icons.TrendingUp} className="h-4 w-4 text-muted-foreground" />
              股票管理
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
