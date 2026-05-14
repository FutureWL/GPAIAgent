import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BacktestsService {
  constructor(private readonly prismaService: PrismaService) {}

  async list(strategyId: string) {
    return this.prismaService.backtest.findMany({
      where: { strategyId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        params: true,
        result: true,
        summary: true,
        createdAt: true,
      },
    });
  }

  async create(params: {
    strategyId: string;
    name: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    params?: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    result?: any;
    summary?: string;
    authorId: string;
  }) {
    const strategy = await this.prismaService.strategy.findUnique({
      where: { id: params.strategyId },
    });
    if (!strategy) {
      throw new NotFoundException('Strategy not found');
    }

    if (strategy.authorId !== params.authorId) {
      throw new NotFoundException('Strategy not found');
    }

    return this.prismaService.backtest.create({
      data: {
        name: params.name,
        params: params.params ?? {},
        result: params.result ?? {},
        summary: params.summary,
        strategyId: params.strategyId,
      },
      select: {
        id: true,
        name: true,
        params: true,
        result: true,
        summary: true,
        createdAt: true,
      },
    });
  }
}
