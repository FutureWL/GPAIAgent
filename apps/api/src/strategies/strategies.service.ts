import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class StrategiesService {
  constructor(private readonly prismaService: PrismaService) {}

  async list(params?: { take?: number; skip?: number }) {
    const take = Math.min(Math.max(params?.take ?? 20, 1), 50);
    const skip = Math.max(params?.skip ?? 0, 0);

    const items = await this.prismaService.strategy.findMany({
      take,
      skip,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        description: true,
        tags: true,
        viewCount: true,
        createdAt: true,
        updatedAt: true,
        author: { select: { id: true, username: true, name: true, avatar: true } },
      },
    });

    return items;
  }

  async getById(id: string) {
    const strategy = await this.prismaService.strategy.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        description: true,
        content: true,
        tags: true,
        viewCount: true,
        createdAt: true,
        updatedAt: true,
        author: { select: { id: true, username: true, name: true, avatar: true } },
      },
    });

    if (!strategy) {
      throw new NotFoundException('Strategy not found');
    }

    return strategy;
  }

  async create(params: { title: string; description: string; content: string; tags: string[]; authorId: string }) {
    const strategy = await this.prismaService.strategy.create({
      data: {
        title: params.title,
        description: params.description,
        content: params.content,
        tags: params.tags,
        authorId: params.authorId,
      },
      select: {
        id: true,
        title: true,
        description: true,
        content: true,
        tags: true,
        viewCount: true,
        createdAt: true,
        updatedAt: true,
        author: { select: { id: true, username: true, name: true, avatar: true } },
      },
    });

    return strategy;
  }
}
