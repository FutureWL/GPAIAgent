"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { TrendingUp, RefreshCw, Database } from 'lucide-react';
import { Icon, icons } from '@/components/ui/icon';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface Stock {
  id: string;
  code: string;
  name: string;
  market: string;
  type: string;
  createdAt: string;
  _count?: { quotes: number; strategies: number };
}

interface SyncStatus {
  queueDepth: number;
  recentJobs: number;
}

export default function StocksPage() {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [stocksRes, syncRes] = await Promise.all([
        fetch('http://localhost:3001/admin/stocks', { credentials: 'include', cache: 'no-store' }),
        fetch('http://localhost:3001/admin/sync/status', { credentials: 'include', cache: 'no-store' }),
      ]);
      if (stocksRes.ok) {
        const data = await stocksRes.json();
        setStocks(data.items || []);
      }
      if (syncRes.ok) {
        const data = await syncRes.json();
        setSyncStatus(data);
      }
    } catch {
      toast.error('加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleTriggerSync = async () => {
    setTriggering(true);
    try {
      const res = await fetch('http://localhost:3001/admin/sync/trigger', {
        method: 'POST',
        credentials: 'include',
        cache: 'no-store',
      });
      if (!res.ok) throw new Error('触发失败');
      toast.success('同步已触发');
      fetchData();
    } catch {
      toast.error('触发同步失败');
    } finally {
      setTriggering(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">股票管理</h1>
        <Button
          variant="default"
          size="sm"
          onClick={handleTriggerSync}
          disabled={triggering}
          className="gap-1.5"
        >
          <Icon name={icons.RefreshCw} className={`h-4 w-4 ${triggering ? 'animate-spin' : ''}`} />
          {triggering ? '同步中...' : '触发全量同步'}
        </Button>
      </div>

      {/* Sync status */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">同步队列</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{syncStatus?.queueDepth ?? '-'}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">近 24h 同步任务</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{syncStatus?.recentJobs ?? '-'}</div>
          </CardContent>
        </Card>
      </div>

      {/* Stocks table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium">股票列表</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>代码</TableHead>
                <TableHead>名称</TableHead>
                <TableHead>市场</TableHead>
                <TableHead>类型</TableHead>
                <TableHead>行情快照</TableHead>
                <TableHead>关联策略</TableHead>
                <TableHead>入库时间</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {[1, 2, 3, 4, 5, 6, 7].map((j) => (
                      <TableCell key={j}><div className="h-4 w-20 bg-muted rounded animate-pulse" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : stocks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    暂无股票数据
                  </TableCell>
                </TableRow>
              ) : (
                stocks.map((stock) => (
                  <TableRow key={stock.id}>
                    <TableCell className="font-mono font-medium">{stock.code}</TableCell>
                    <TableCell>{stock.name}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{stock.market}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{stock.type}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{stock._count?.quotes ?? 0}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{stock._count?.strategies ?? 0}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(stock.createdAt).toLocaleDateString('zh-CN')}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
