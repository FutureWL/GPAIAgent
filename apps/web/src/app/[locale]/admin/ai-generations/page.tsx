"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { BotMessageSquare, FileText } from 'lucide-react';
import { Icon, icons } from '@/components/ui/icon';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';

interface AiGeneration {
  id: number;
  type: string;
  prompt: string;
  model: string;
  userId: number;
  createdAt: string;
}

export default function AiGenerationsPage() {
  const [records, setRecords] = useState<AiGeneration[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [total, setTotal] = useState(0);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `http://localhost:3001/admin/ai-generations?page=${page}&pageSize=${pageSize}`,
        { credentials: 'include', cache: 'no-store' }
      );
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setRecords(data.items || []);
      setTotal(data.total || 0);
    } catch {
      // silent fail
    } finally {
      setLoading(false);
    }
  }, [page, pageSize]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">AI 生成记录</h1>
        <span className="text-sm text-muted-foreground">共 {total} 条记录</span>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>类型</TableHead>
                <TableHead>模型</TableHead>
                <TableHead>用户ID</TableHead>
                <TableHead>时间</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {[1, 2, 3, 4, 5].map((j) => (
                      <TableCell key={j}><div className="h-4 w-20 bg-muted rounded animate-pulse" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : records.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    暂无 AI 生成记录
                  </TableCell>
                </TableRow>
              ) : (
                records.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs">{r.id}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Icon name={icons.BotMessageSquare} className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">{r.type}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">{r.model}</TableCell>
                    <TableCell className="font-mono text-xs">{r.userId}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(r.createdAt).toLocaleDateString('zh-CN')}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {!loading && total > pageSize && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">第 {page} / {totalPages} 页，共 {total} 条</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>上一页</Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>下一页</Button>
          </div>
        </div>
      )}
    </div>
  );
}
