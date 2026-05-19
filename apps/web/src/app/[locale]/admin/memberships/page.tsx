"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { CreditCard, Users } from 'lucide-react';
import { Icon, icons } from '@/components/ui/icon';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface Membership {
  id: string;
  level: 'NORMAL' | 'PRIVATE';
  type: 'TRIAL' | 'MONTHLY';
  status: 'ACTIVE' | 'EXPIRED';
  startedAt: string;
  expiredAt: string;
  user: { id: string; username: string; name: string | null; email: string | null };
}

interface MembershipStats {
  total: number;
  active: number;
  expired: number;
  trial: number;
  private: number;
}

export default function MembershipsPage() {
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [stats, setStats] = useState<MembershipStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
      if (statusFilter !== 'all') params.set('status', statusFilter);
      const [mRes, sRes] = await Promise.all([
        fetch(`http://127.0.0.1:3002/admin/memberships?${params}`, {
          credentials: 'include',
          cache: 'no-store',
        }),
        fetch('http://127.0.0.1:3002/admin/memberships/stats', {
          credentials: 'include',
          cache: 'no-store',
        }),
      ]);
      if (mRes.ok) {
        const data = await mRes.json();
        setMemberships(data.items || []);
        setTotal(data.total || 0);
      }
      if (sRes.ok) {
        const data = await sRes.json();
        setStats(data);
      }
    } catch {
      toast.error('加载会员数据失败');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, statusFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const totalPages = Math.ceil(total / pageSize);

  const statusBadge = (status: Membership['status']) => {
    if (status === 'ACTIVE') {
      return <Badge className="bg-green-600 hover:bg-green-600 gap-1"><Icon name={icons.CheckCircle} className="h-3 w-3" /> 有效</Badge>;
    }
    return <Badge variant="secondary" className="gap-1"><Icon name={icons.XCircle} className="h-3 w-3" /> 已过期</Badge>;
  };

  const levelBadge = (level: Membership['level']) => {
    if (level === 'PRIVATE') {
      return <Badge variant="default" className="bg-purple-600 hover:bg-purple-600">私人会员</Badge>;
    }
    return <Badge variant="outline">普通会员</Badge>;
  };

  const typeLabel = (type: Membership['type']) => {
    return type === 'TRIAL' ? '体验卡' : '月卡';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">会员管理</h1>
        <span className="text-sm text-muted-foreground">共 {total} 位会员</span>
      </div>

      {/* Stats cards */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">会员总数</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">有效会员</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.active}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">已过期</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-muted-foreground">{stats.expired}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">私人会员</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">{stats.private}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filter */}
      <div className="flex gap-2">
        {[
          { value: 'all', label: '全部' },
          { value: 'active', label: '有效' },
          { value: 'expired', label: '已过期' },
        ].map((s) => (
          <Button
            key={s.value}
            variant={statusFilter === s.value ? 'default' : 'outline'}
            size="sm"
            onClick={() => { setStatusFilter(s.value); setPage(1); }}
          >
            {s.label}
          </Button>
        ))}
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>用户</TableHead>
                <TableHead>等级</TableHead>
                <TableHead>类型</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>开始时间</TableHead>
                <TableHead>到期时间</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {[1, 2, 3, 4, 5, 6].map((j) => (
                      <TableCell key={j}><div className="h-4 w-20 bg-muted rounded animate-pulse" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : memberships.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    暂无会员数据
                  </TableCell>
                </TableRow>
              ) : (
                memberships.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Icon name={icons.User} className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div>
                          <div className="font-medium text-sm">{m.user.name || m.user.username}</div>
                          <div className="text-xs text-muted-foreground">{m.user.email ?? m.user.username}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{levelBadge(m.level)}</TableCell>
                    <TableCell>
                      <span className="text-sm">{typeLabel(m.type)}</span>
                    </TableCell>
                    <TableCell>{statusBadge(m.status)}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(m.startedAt).toLocaleDateString('zh-CN')}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(m.expiredAt).toLocaleDateString('zh-CN')}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {!loading && total > pageSize && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            第 {page} / {totalPages} 页，共 {total} 条
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
              上一页
            </Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
              下一页
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
