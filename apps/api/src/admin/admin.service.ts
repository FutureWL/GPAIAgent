import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { User } from '@prisma/client';
import { AuditLog } from '@prisma/client';

export type UserWithStats = {
  id: string;
  username: string;
  name: string | null;
  email: string | null;
  avatar: string | null;
  role: string;
  disabled: boolean;
  createdAt: Date;
  _count: {
    posts: number;
    strategies: number;
  };
};

export type AuditLogWithAdmin = AuditLog & {
  admin: Pick<User, 'id' | 'username' | 'name'>;
};

export type PaginatedResult<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

@Injectable()
export class AdminService {
  constructor(private readonly prismaService: PrismaService) {}

  // ============ 用户管理 ============

  async getUsers(params: { page?: number; pageSize?: number; search?: string }): Promise<PaginatedResult<UserWithStats>> {
    const page = Math.max(1, params.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, params.pageSize ?? 20));
    const skip = (page - 1) * pageSize;

    const where = params.search
      ? {
          OR: [
            { username: { contains: params.search, mode: 'insensitive' as const } },
            { name: { contains: params.search, mode: 'insensitive' as const } },
            { email: { contains: params.search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const [items, total] = await Promise.all([
      this.prismaService.user.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          username: true,
          name: true,
          email: true,
          avatar: true,
          role: true,
          disabled: true,
          createdAt: true,
          _count: { select: { posts: true, strategies: true } },
        },
      }),
      this.prismaService.user.count({ where }),
    ]);

    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async getUser(id: string) {
    return this.prismaService.user.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        name: true,
        email: true,
        avatar: true,
        role: true,
        disabled: true,
        createdAt: true,
        _count: { select: { posts: true, strategies: true } },
      },
    });
  }

  async updateUserRole(params: { adminId: string; targetUserId: string; role: string; ip?: string }) {
    const { adminId, targetUserId, role, ip } = params;

    const before = await this.prismaService.user.findUnique({ where: { id: targetUserId }, select: { role: true } });

    const updated = await this.prismaService.user.update({
      where: { id: targetUserId },
      data: { role: role as 'USER' | 'ADMIN' },
      select: { id: true, username: true, role: true },
    });

    await this.prismaService.auditLog.create({
      data: {
        adminId,
        action: 'USER_ROLE_CHANGE',
        targetType: 'User',
        targetId: targetUserId,
        detail: { before: before?.role, after: role },
        ip,
      },
    });

    return updated;
  }

  async toggleUserDisabled(params: { adminId: string; targetUserId: string; disabled: boolean; ip?: string }) {
    const { adminId, targetUserId, disabled, ip } = params;

    const before = await this.prismaService.user.findUnique({ where: { id: targetUserId }, select: { disabled: true } });

    const updated = await this.prismaService.user.update({
      where: { id: targetUserId },
      data: { disabled },
      select: { id: true, username: true, disabled: true },
    });

    await this.prismaService.auditLog.create({
      data: {
        adminId,
        action: 'USER_DISABLE',
        targetType: 'User',
        targetId: targetUserId,
        detail: { before: before?.disabled, after: disabled },
        ip,
      },
    });

    return updated;
  }

  // ============ 内容审核 ============

  async getPosts(params: { page?: number; pageSize?: number; status?: string; search?: string }) {
    const page = Math.max(1, params.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, params.pageSize ?? 20));
    const skip = (page - 1) * pageSize;

    const where: any = {};
    if (params.status) where.status = params.status;
    if (params.search) {
      where.OR = [
        { title: { contains: params.search, mode: 'insensitive' } },
        { author: { username: { contains: params.search, mode: 'insensitive' } } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prismaService.post.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: { author: { select: { id: true, username: true, name: true } } },
      }),
      this.prismaService.post.count({ where }),
    ]);

    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async reviewPost(params: { adminId: string; postId: string; action: 'approve' | 'reject' | 'remove'; reason?: string; ip?: string }) {
    const { adminId, postId, action, reason, ip } = params;

    const statusMap = { approve: 'published', reject: 'rejected', remove: 'removed' } as const;
    const newStatus = statusMap[action];

    const before = await this.prismaService.post.findUnique({ where: { id: postId }, select: { status: true } });

    const updated = await this.prismaService.post.update({
      where: { id: postId },
      data: { status: newStatus },
      select: { id: true, title: true, status: true },
    });

    await this.prismaService.auditLog.create({
      data: {
        adminId,
        action: `POST_REVIEW_${action.toUpperCase()}`,
        targetType: 'Post',
        targetId: postId,
        detail: { before: before?.status, after: newStatus, reason },
        ip,
      },
    });

    return updated;
  }

  async getStrategies(params: { page?: number; pageSize?: number; status?: string; search?: string }) {
    const page = Math.max(1, params.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, params.pageSize ?? 20));
    const skip = (page - 1) * pageSize;

    const where: any = {};
    if (params.status) where.status = params.status;
    if (params.search) {
      where.OR = [
        { title: { contains: params.search, mode: 'insensitive' } },
        { author: { username: { contains: params.search, mode: 'insensitive' } } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prismaService.strategy.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: { author: { select: { id: true, username: true, name: true } } },
      }),
      this.prismaService.strategy.count({ where }),
    ]);

    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async reviewStrategy(params: { adminId: string; strategyId: string; action: 'approve' | 'reject' | 'remove'; reason?: string; ip?: string }) {
    const { adminId, strategyId, action, reason, ip } = params;

    const statusMap = { approve: 'published', reject: 'rejected', remove: 'removed' } as const;
    const newStatus = statusMap[action];

    const before = await this.prismaService.strategy.findUnique({ where: { id: strategyId }, select: { status: true } });

    const updated = await this.prismaService.strategy.update({
      where: { id: strategyId },
      data: { status: newStatus },
      select: { id: true, title: true, status: true },
    });

    await this.prismaService.auditLog.create({
      data: {
        adminId,
        action: `STRATEGY_REVIEW_${action.toUpperCase()}`,
        targetType: 'Strategy',
        targetId: strategyId,
        detail: { before: before?.status, after: newStatus, reason },
        ip,
      },
    });

    return updated;
  }

  // ============ 平台统计 ============

  async getStats() {
    const [
      userCount,
      postCount,
      strategyCount,
      pendingPosts,
      pendingStrategies,
      stockCount,
      syncQueuePending,
      syncJobsRecent,
    ] = await Promise.all([
      this.prismaService.user.count(),
      this.prismaService.post.count(),
      this.prismaService.strategy.count(),
      this.prismaService.post.count({ where: { status: 'pending_review' } }),
      this.prismaService.strategy.count({ where: { status: 'pending_review' } }),
      this.prismaService.stock.count(),
      this.prismaService.syncQueue.count({ where: { status: 'PENDING' } }),
      this.prismaService.syncJob.count({
        where: { startedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
      }),
    ]);

    return {
      userCount,
      postCount,
      strategyCount,
      pendingPosts,
      pendingStrategies,
      stockCount,
      syncQueuePending,
      syncJobsRecent,
    };
  }

  // ============ 同步管理 ============

  async getSyncQueue(params: { page?: number; pageSize?: number; status?: string }) {
    const page = Math.max(1, params.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, params.pageSize ?? 20));
    const skip = (page - 1) * pageSize;

    const where = params.status ? { status: params.status as any } : {};

    const [items, total] = await Promise.all([
      this.prismaService.syncQueue.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
      }),
      this.prismaService.syncQueue.count({ where }),
    ]);

    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async getSyncJobs(params: { page?: number; pageSize?: number }) {
    const page = Math.max(1, params.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, params.pageSize ?? 20));
    const skip = (page - 1) * pageSize;

    const [items, total] = await Promise.all([
      this.prismaService.syncJob.findMany({
        skip,
        take: pageSize,
        orderBy: { startedAt: 'desc' },
      }),
      this.prismaService.syncJob.count(),
    ]);

    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async triggerSync(params: { adminId: string; ip?: string }) {
    // 创建一个全量同步任务
    const queue = await this.prismaService.syncQueue.create({
      data: {
        type: 'DAILY_KLINE',
        target: 'ALL',
        priority: 100,
        status: 'PENDING',
      },
    });

    await this.prismaService.auditLog.create({
      data: {
        adminId: params.adminId,
        action: 'STOCK_SYNC_TRIGGER',
        targetType: 'SyncJob',
        targetId: queue.id,
        detail: { target: 'ALL', type: 'DAILY_KLINE' },
        ip: params.ip,
      },
    });

    return { id: queue.id, target: queue.target, type: queue.type, status: queue.status };
  }

  // ============ 操作日志 ============

  async getAuditLogs(params: { page?: number; pageSize?: number; action?: string; targetType?: string }) {
    const page = Math.max(1, params.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, params.pageSize ?? 50));
    const skip = (page - 1) * pageSize;

    const where: any = {};
    if (params.action) where.action = params.action;
    if (params.targetType) where.targetType = params.targetType;

    const [items, total] = await Promise.all([
      this.prismaService.auditLog.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: { admin: { select: { id: true, username: true, name: true } } },
      }),
      this.prismaService.auditLog.count({ where }),
    ]);

    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }
}
