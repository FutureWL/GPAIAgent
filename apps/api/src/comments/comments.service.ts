import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CommentsService {
  constructor(private readonly prismaService: PrismaService) {}

  async list(strategyId: string) {
    const items = await this.prismaService.comment.findMany({
      where: { strategyId },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        content: true,
        createdAt: true,
        author: { select: { id: true, username: true, name: true, avatar: true } },
      },
    });
    return items;
  }

  async create(params: { strategyId: string; authorId: string; content: string }) {
    const strategy = await this.prismaService.strategy.findUnique({ where: { id: params.strategyId } });
    if (!strategy) {
      throw new NotFoundException('Strategy not found');
    }

    const comment = await this.prismaService.comment.create({
      data: {
        content: params.content,
        strategyId: params.strategyId,
        authorId: params.authorId,
      },
      select: {
        id: true,
        content: true,
        createdAt: true,
        author: { select: { id: true, username: true, name: true, avatar: true } },
      },
    });

    return comment;
  }
}
