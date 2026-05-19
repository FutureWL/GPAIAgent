/**
 * MarketService — 市场数据服务层（供前端 API 调用）
 *
 * 原则：优先读数据库，数据库没有则回源补缺
 */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface QuoteResult {
  code: string;
  name: string;
  price: number;
  change: number;
  changePct: number;
  open: number;
  high: number;
  low: number;
  volume: number;
  amount: number;
  turnover: number;
  preClose: number;
  marketCap: number;
  circulateCap: number;
  netInflow: number;
  capturedAt: string;
}

@Injectable()
export class MarketService {
  constructor(private readonly prisma: PrismaService) {}

  /** 获取最新实时行情（优先 DB，没有则调 API 回源） */
  async getQuote(code: string): Promise<QuoteResult | null> {
    const stock = await this.prisma.stock.findUnique({ where: { code } });
    if (!stock) return null;

    // 从 DB 最新一条快照
    const latest = await this.prisma.stockQuote.findFirst({
      where: { stockId: stock.id },
      orderBy: { capturedAt: 'desc' },
    });

    if (latest) {
      return {
        code,
        name: stock.name,
        price: latest.price,
        change: latest.change,
        changePct: latest.changePct,
        open: latest.open,
        high: latest.high,
        low: latest.low,
        volume: latest.volume,
        amount: latest.amount,
        turnover: latest.turnover ?? 0,
        preClose: latest.preClose,
        marketCap: latest.marketCap ?? 0,
        circulateCap: latest.circulateCap ?? 0,
        netInflow: latest.netInflow ?? 0,
        capturedAt: latest.capturedAt.toISOString(),
      };
    }

    return null; // 没有快照数据时由调用方决定如何处理
  }

  /** 批量获取实时行情 */
  async getBatchQuotes(codes: string[]): Promise<QuoteResult[]> {
    const results: QuoteResult[] = [];
    for (const code of codes) {
      const q = await this.getQuote(code);
      if (q) results.push(q);
    }
    return results;
  }

  /** 获取日K线（优先 DB，按日期倒序） */
  async getDailyKline(code: string, count = 120): Promise<any[]> {
    const stock = await this.prisma.stock.findUnique({ where: { code } });
    if (!stock) return [];

    const records = await this.prisma.stockDaily.findMany({
      where: { stockId: stock.id },
      orderBy: { date: 'desc' },
      take: count,
    });

    return records.map(r => ({
      date: r.date.toISOString().slice(0, 10),
      open: r.open,
      close: r.close,
      high: r.high,
      low: r.low,
      volume: r.volume,
      amount: r.amount,
    }));
  }

  /** 获取多周期K线（从 StockPeriodKline 表） */
  async getPeriodKline(code: string, period: string, count = 120): Promise<any[]> {
    const stock = await this.prisma.stock.findUnique({ where: { code } });
    if (!stock) return [];

    const records = await this.prisma.stockPeriodKline.findMany({
      where: { stockId: stock.id, period },
      orderBy: { date: 'desc' },
      take: count,
    });

    return records.map(r => ({
      date: r.date.toISOString().slice(0, 10),
      open: r.open,
      close: r.close,
      high: r.high,
      low: r.low,
      volume: r.volume,
    }));
  }

  /** 获取分钟K线 */
  async getMinuteKline(code: string, period: string, count = 300): Promise<any[]> {
    return this.getPeriodKline(code, period, count);
  }

  /** 获取同步任务状态 */
  async getQueueStatus(): Promise<{ pending: number; processing: number; completed: number; failed: number }> {
    const counts = await this.prisma.syncQueue.groupBy({
      by: ['status'],
      _count: { id: true },
    });

    const result = { pending: 0, processing: 0, completed: 0, failed: 0 };
    for (const c of counts) {
      switch (c.status) {
        case 'PENDING':   result.pending = c._count.id; break;
        case 'PROCESSING': result.processing = c._count.id; break;
        case 'COMPLETED': result.completed = c._count.id; break;
        case 'FAILED':    result.failed = c._count.id; break;
      }
    }
    return result;
  }

  /** 获取最新同步任务记录 */
  async getRecentJobs(limit = 10): Promise<any[]> {
    const jobs = await this.prisma.syncJob.findMany({
      orderBy: { startedAt: 'desc' },
      take: limit,
    });
    return jobs.map(j => ({
      type: j.type,
      target: j.target,
      period: j.period,
      status: j.status,
      itemsTotal: j.itemsTotal,
      itemsOk: j.itemsOk,
      durationMs: j.durationMs,
      startedAt: j.startedAt.toISOString(),
      completedAt: j.completedAt?.toISOString() ?? null,
    }));
  }
}
