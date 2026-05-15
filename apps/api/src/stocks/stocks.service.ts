import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// 模拟股票数据（正式环境替换为真实行情数据源）
const MOCK_STOCKS = [
  { code: '600519', name: '贵州茅台', market: 'sh', type: 'stock' },
  { code: '000858', name: '五粮液', market: 'sz', type: 'stock' },
  { code: '600036', name: '招商银行', market: 'sh', type: 'stock' },
  { code: '601318', name: '中国平安', market: 'sh', type: 'stock' },
  { code: '000333', name: '美的集团', market: 'sz', type: 'stock' },
  { code: '002594', name: '比亚迪', market: 'sz', type: 'stock' },
  { code: '600887', name: '伊利股份', market: 'sh', type: 'stock' },
  { code: '000001', name: '平安银行', market: 'sz', type: 'stock' },
  { code: '600030', name: '中信证券', market: 'sh', type: 'stock' },
  { code: '601888', name: '中国中免', market: 'sh', type: 'stock' },
  { code: '300750', name: '宁德时代', market: 'sz', type: 'stock' },
  { code: '688981', name: '中芯国际', market: 'sh', type: 'stock' },
  { code: '600009', name: '上海机场', market: 'sh', type: 'stock' },
  { code: '000895', name: '双汇发展', market: 'sz', type: 'stock' },
  { code: '601166', name: '兴业银行', market: 'sh', type: 'stock' },
  { code: '002415', name: '海康威视', market: 'sz', type: 'stock' },
  { code: '600276', name: '恒瑞医药', market: 'sh', type: 'stock' },
  { code: '000725', name: '京东方A', market: 'sz', type: 'stock' },
  { code: '601012', name: '隆基绿能', market: 'sh', type: 'stock' },
  { code: '002475', name: '立讯精密', market: 'sz', type: 'stock' },
];

@Injectable()
export class StocksService {
  constructor(private readonly prismaService: PrismaService) {}

  // 确保股票在数据库中存在，不存在则创建
  async ensureStock(code: string, name: string, market: string, type = 'stock') {
    return this.prismaService.stock.upsert({
      where: { code },
      create: { code, name, market, type },
      update: {},
    });
  }

  // 搜索股票（模糊匹配代码或名称）
  async search(query: string) {
    const q = query.trim();
    if (!q) return [];

    const dbStocks = await this.prismaService.stock.findMany({
      where: {
        OR: [
          { code: { contains: q } },
          { name: { contains: q } },
        ],
      },
      take: 20,
    });

    // 如果数据库没有足够的股票，补充 mock 数据
    const mockMatches = MOCK_STOCKS.filter(
      (s) =>
        s.code.includes(q.toUpperCase()) ||
        s.name.includes(q) ||
        q.length < 3,
    );

    const merged = [...dbStocks];
    for (const mock of mockMatches) {
      if (!merged.find((s) => s.code === mock.code)) {
        await this.ensureStock(mock.code, mock.name, mock.market, mock.type);
        merged.push({ id: mock.code, code: mock.code, name: mock.name, market: mock.market, type: mock.type, createdAt: new Date() });
      }
      if (merged.length >= 20) break;
    }

    return merged.slice(0, 20);
  }

  // 获取单只股票详情
  async getByCode(code: string) {
    // 确保 mock 股票入库
    const mock = MOCK_STOCKS.find((s) => s.code === code);
    if (mock) {
      await this.ensureStock(mock.code, mock.name, mock.market, mock.type);
    }

    const stock = await this.prismaService.stock.findUnique({ where: { code } });
    if (!stock) {
      throw new NotFoundException('股票不存在');
    }

    // 附加模拟行情数据（正式环境替换为真实数据）
    return {
      ...stock,
      price: this.mockPrice(code),
      change: this.mockChange(),
      changePercent: this.mockChangePercent(),
      volume: this.mockVolume(),
    };
  }

  // 获取相关策略
  async getStrategies(code: string, take = 10) {
    return this.prismaService.strategy.findMany({
      where: { stockCode: code },
      take,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        description: true,
        riskLevel: true,
        viewCount: true,
        createdAt: true,
        author: { select: { id: true, username: true, name: true } },
        _count: { select: { likes: true } },
      },
    }).then(items => items.map(s => ({ ...s, likeCount: s._count.likes })));
  }

  // ============ 自选股 ============

  async listUserStocks(userId: string) {
    const userStocks = await this.prismaService.userStock.findMany({
      where: { userId },
      include: { stock: true },
      orderBy: { addedAt: 'desc' },
    });

    return userStocks.map((us) => ({
      addedAt: us.addedAt,
      stock: {
        ...us.stock,
        price: this.mockPrice(us.stock.code),
        change: this.mockChange(),
        changePercent: this.mockChangePercent(),
        volume: this.mockVolume(),
      },
    }));
  }

  async addUserStock(userId: string, stockCode: string) {
    const stock = await this.prismaService.stock.findUnique({ where: { code: stockCode } });
    if (!stock) {
      // 尝试从 mock 中找
      const mock = MOCK_STOCKS.find((s) => s.code === stockCode);
      if (mock) {
        await this.ensureStock(mock.code, mock.name, mock.market, mock.type);
      } else {
        throw new NotFoundException('股票不存在');
      }
    }

    try {
      await this.prismaService.userStock.create({
        data: { userId, stockId: stock!.id },
      });
    } catch {
      // 已存在，忽略
    }

    return { success: true };
  }

  async removeUserStock(userId: string, stockCode: string) {
    const stock = await this.prismaService.stock.findUnique({ where: { code: stockCode } });
    if (!stock) return { success: true };
    await this.prismaService.userStock.deleteMany({
      where: { userId, stockId: stock.id },
    });
    return { success: true };
  }

  // ============ 模拟行情数据（正式环境替换） ============

  private mockPrice(code: string): number {
    const base: Record<string, number> = {
      '600519': 1680.0, '000858': 145.6, '600036': 35.8,
      '601318': 42.5, '000333': 62.3, '002594': 238.5,
      '600887': 26.4, '000001': 11.2, '600030': 21.5,
      '601888': 68.9, '300750': 186.5, '688981': 48.3,
    };
    return base[code] ?? (Math.random() * 200 + 10);
  }

  private mockChange(): number {
    return (Math.random() - 0.5) * 10;
  }

  private mockChangePercent(): number {
    return (Math.random() - 0.5) * 10;
  }

  private mockVolume(): number {
    return Math.floor(Math.random() * 1_000_000_000);
  }
}
