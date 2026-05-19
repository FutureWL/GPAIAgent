import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export type SignalType = 'BUY' | 'SELL' | 'HOLD';

export interface AiSignal {
  id: string;
  stockCode: string;
  stockName: string;
  type: SignalType;
  reason: string;
  price: number;
  createdAt: string;
}

@Injectable()
export class AiSignalsService {
  constructor(private readonly prisma: PrismaService) {}

  // 今日 AI 信号列表（从数据库读取，未实现前返回模拟数据）
  async getTodaySignals(limit = 3): Promise<AiSignal[]> {
    try {
      const signals = await (this.prisma as any).aiSignal.findMany({
        where: {
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        include: {
          stock: { select: { code: true, name: true } },
        },
      });
      return signals.map((s: any) => ({
        id: s.id,
        stockCode: s.stock.code,
        stockName: s.stock.name,
        type: s.type,
        reason: s.reason,
        price: s.price,
        createdAt: s.createdAt.toISOString(),
      }));
    } catch {
      // 无表或无数据时返回模拟信号
      return this.getMockSignals();
    }
  }

  // 模拟 AI 信号（正式实现前使用）
  private getMockSignals(): AiSignal[] {
    return [
      {
        id: 'mock-1',
        stockCode: '600519',
        stockName: '贵州茅台',
        type: 'BUY',
        reason: '价格回踩20日均线，MACD 金叉形成，成交量放大',
        price: 1680.5,
        createdAt: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
      },
      {
        id: 'mock-2',
        stockCode: '000858',
        stockName: '五粮液',
        type: 'HOLD',
        reason: '高位震荡，RSI 接近超买区域，建议持有观察',
        price: 145.6,
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'mock-3',
        stockCode: '300750',
        stockName: '宁德时代',
        type: 'SELL',
        reason: '放量跌破10日均线，KDJ 高位死叉，趋势转弱',
        price: 186.5,
        createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
      },
    ];
  }
}
