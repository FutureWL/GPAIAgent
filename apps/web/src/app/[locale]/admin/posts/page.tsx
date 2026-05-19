"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { CheckCircle, XCircle, Eye, FileText } from 'lucide-react';
import { Icon, icons } from '@/components/ui/icon';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface Post {
  id: string;
  title: string;
  content: string;
  author: { id: string; username: string; name: string | null };
  status: 'pending_review' | 'published' | 'rejected' | 'removed';
  viewCount: number;
  likeCount: number;
  commentCount?: number;
  shareCount?: number;
  type?: string;
  coverImage?: string | null;
  createdAt: string;
  updatedAt?: string;
}

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  pending_review: { label: '待审核', className: 'bg-orange-500 text-white hover:bg-orange-500' },
  published: { label: '已发布', className: 'bg-green-600 hover:bg-green-600' },
  rejected: { label: '已拒绝', className: 'bg-red-600 hover:bg-red-600' },
  removed: { label: '已删除', className: 'bg-gray-500 hover:bg-gray-500' },
};

export default function PostsPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [actingId, setActingId] = useState<string | null>(null);
  const [previewPost, setPreviewPost] = useState<Post | null>(null);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
      if (statusFilter !== 'all') params.set('status', statusFilter);
      const res = await fetch(
        `http://localhost:3001/admin/posts?${params}`,
        { credentials: 'include', cache: 'no-store' }
      );
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setPosts(data.items || []);
      setTotal(data.total || 0);
    } catch {
      toast.error('加载帖子列表失败');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, statusFilter]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const handleReview = async (postId: string, action: 'approve' | 'reject' | 'remove') => {
    setActingId(postId);
    try {
      const res = await fetch(`http://localhost:3001/admin/posts/${postId}/review`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) throw new Error('审核失败');
      toast.success(action === 'approve' ? '已通过审核' : '已拒绝');
      fetchPosts();
    } catch {
      toast.error('审核操作失败');
    } finally {
      setActingId(null);
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">博客管理</h1>
        <div className="flex gap-2">
          {['all', 'pending_review', 'published', 'rejected', 'removed'].map((s) => (
            <Button
              key={s}
              variant={statusFilter === s ? 'default' : 'outline'}
              size="sm"
              onClick={() => { setStatusFilter(s); setPage(1); }}
            >
              {s === 'all' ? '全部' : STATUS_LABELS[s]?.label ?? s}
            </Button>
          ))}
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>标题</TableHead>
                <TableHead>作者</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>浏览</TableHead>
                <TableHead>点赞</TableHead>
                <TableHead>时间</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 8 }).map((_, j) => (
                      <TableCell key={j}>
                        <div className="h-4 w-20 bg-muted rounded animate-pulse" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : posts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    暂无帖子
                  </TableCell>
                </TableRow>
              ) : (
                posts.map((post) => {
                  const st = STATUS_LABELS[post.status] ?? { label: post.status, className: '' };
                  return (
                    <TableRow key={post.id}>
                      <TableCell className="font-mono text-xs">{post.id}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Icon name={icons.FileText} className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="font-medium text-sm line-clamp-1">{post.title}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {post.author?.username ?? String(post.author)}
                      </TableCell>
                      <TableCell>
                        <Badge className={st.className}>{st.label}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">{post.viewCount}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{post.likeCount}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {new Date(post.createdAt).toLocaleDateString('zh-CN')}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setPreviewPost(post)}
                          >
                            <Icon name={icons.Eye} className="h-4 w-4" />
                          </Button>
                          {post.status === 'pending_review' && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-green-600 hover:text-green-700"
                                disabled={actingId === post.id}
                                onClick={() => handleReview(post.id, 'approve')}
                              >
                                <Icon name={icons.CheckCircle} className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-red-600 hover:text-red-700"
                                disabled={actingId === post.id}
                                onClick={() => handleReview(post.id, 'reject')}
                              >
                                <Icon name={icons.XCircle} className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

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

      {/* Preview dialog */}
      <Dialog open={!!previewPost} onOpenChange={() => setPreviewPost(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{previewPost?.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <div className="flex gap-4 text-muted-foreground">
              <span>作者：{previewPost?.author && typeof previewPost.author === 'object' ? previewPost.author.username : String(previewPost?.author ?? '')}</span>
              <span>浏览：{previewPost?.viewCount}</span>
              <span>点赞：{previewPost?.likeCount}</span>
            </div>
            <div className="border-t pt-3 max-h-96 overflow-y-auto">
              <p className="whitespace-pre-wrap">{previewPost?.content}</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
