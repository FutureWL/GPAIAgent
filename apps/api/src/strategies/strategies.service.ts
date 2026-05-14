import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class StrategiesService {
  constructor(private readonly prismaService: PrismaService) {}

  async list(params?: { take?: number; skip?: number; stockCode?: string; riskLevel?: string }) {
    const take = Math.min(Math.max(params?.take ?? 20, 1), 50);
    const skip = Math.max(params?.skip ?? 0, 0);

    const where: Record<string, unknown> = {};
    if (params?.stockCode) where.stockCode = params.stockCode;
    if (params?.riskLevel) where.riskLevel = params.riskLevel;

    const items = await this.prismaService.strategy.findMany({
      where,
      take,
      skip,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        description: true,
        tags: true,
        stockCode: true,
        riskLevel: true,
        viewCount: true,
        createdAt: true,
        updatedAt: true,
        author: { select: { id: true, username: true, name: true, avatar: true } },
        stock: { select: { code: true, name: true } },
        _count: { select: { likes: true } },
      },
    });

    return items.map((s) => ({
      ...s,
      likeCount: s._count.likes,
      stock: s.stock ?? null,
    }));
  }

  async getById(id: string, currentUserId?: string) {
    const strategy = await this.prismaService.strategy.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        description: true,
        content: true,
        tags: true,
        stockCode: true,
        riskLevel: true,
        viewCount: true,
        createdAt: true,
        updatedAt: true,
        author: { select: { id: true, username: true, name: true, avatar: true } },
        stock: { select: { code: true, name: true } },
        likes: currentUserId
          ? { where: { userId: currentUserId }, select: { id: true } }
          : false,
        _count: { select: { likes: true } },
      },
    });

    if (!strategy) {
      throw new NotFoundException('Strategy not found');
    }

    return {
      ...strategy,
      likeCount: strategy._count.likes,
      liked: Array.isArray(strategy.likes) && strategy.likes.length > 0,
    };
  }

  async incrementViewCount(id: string) {
    return this.prismaService.strategy.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
      select: { viewCount: true },
    });
  }

  async like(strategyId: string, userId: string) {
    const strategy = await this.prismaService.strategy.findUnique({ where: { id: strategyId } });
    if (!strategy) {
      throw new NotFoundException('Strategy not found');
    }

    try {
      await this.prismaService.like.create({
        data: { strategyId, userId },
      });
    } catch {
      // already liked — ignore
    }

    const count = await this.prismaService.like.count({ where: { strategyId } });
    return { liked: true, likeCount: count };
  }

  async unlike(strategyId: string, userId: string) {
    await this.prismaService.like.deleteMany({
      where: { strategyId, userId },
    });

    const count = await this.prismaService.like.count({ where: { strategyId } });
    return { liked: false, likeCount: count };
  }

  async create(params: {
    title: string;
    description: string;
    content: string;
    tags: string[];
    stockCode?: string;
    riskLevel?: string;
    authorId: string;
  }) {
    const strategy = await this.prismaService.strategy.create({
      data: {
        title: params.title,
        description: params.description,
        content: params.content,
        tags: params.tags,
        stockCode: params.stockCode,
        riskLevel: params.riskLevel,
        authorId: params.authorId,
      },
      select: {
        id: true,
        title: true,
        description: true,
        content: true,
        tags: true,
        stockCode: true,
        riskLevel: true,
        viewCount: true,
        createdAt: true,
        updatedAt: true,
        author: { select: { id: true, username: true, name: true, avatar: true } },
      },
    });

    return strategy;
  }
}
