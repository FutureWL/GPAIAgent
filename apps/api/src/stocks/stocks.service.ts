import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// 东方财富实时行情类型
export interface RealTimeQuote {
  code: string;       // 股票代码
  name: string;       // 股票名称
  price: number;      // 当前价格
  change: number;     // 涨跌额
  changePercent: number; // 涨跌幅(%)
  volume: number;     // 成交量
  amount: number;     // 成交额
  high: number;       // 最高价
  low: number;        // 最低价
  open: number;       // 开盘价
  preClose: number;   // 昨收价
  market: string;     // 市场(sz/sh)
}

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

  // 东方财富实时行情API (免费，无需key)
  // 文档: https://push2.eastmoney.com/api/qt/stock/get
  // fields: f43=最新价, f44=涨跌额, f45=涨跌幅, f46=成交量, f47=成交额, f48=最高, f49=最低, f50=开盘, f51=昨收
  private async fetchRealTimeQuote(code: string): Promise<RealTimeQuote | null> {
    // 判断市场: 6开头为上海, 0/3开头为深圳
    const secid = code.startsWith('6') ? `1.${code}` : `0.${code}`;
    const url = `https://push2.eastmoney.com/api/qt/stock/get?secid=${secid}&fields=f43,f44,f45,f46,f47,f48,f49,f50,f51,f57,f58`;

    try {
      const resp = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        signal: AbortSignal.timeout(5000),
      });
      if (!resp.ok) return null;

      const json = await resp.json() as { data: any };
      const d = json.data;
      if (!d) return null;

      return {
        code: d.f57,
        name: d.f58,
        price: parseFloat((d.f43 / 100).toFixed(2)),
        change: parseFloat((d.f44 / 100).toFixed(2)),
        changePercent: parseFloat((d.f45 / 100).toFixed(2)),
        volume: d.f46,
        amount: d.f47,
        high: parseFloat((d.f48 / 100).toFixed(2)),
        low: parseFloat((d.f49 / 100).toFixed(2)),
        open: parseFloat((d.f50 / 100).toFixed(2)),
        preClose: parseFloat((d.f51 / 100).toFixed(2)),
        market: code.startsWith('6') ? 'sh' : 'sz',
      };
    } catch {
      return null;
    }
  }

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

    // 获取真实行情数据，失败时降级到模拟数据
    const quote = await this.fetchRealTimeQuote(code);
    if (quote) {
      return { ...stock, ...quote };
    }
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

  // 批量获取实时行情（用于 Header 滚动条、首页行情卡片）
  async getBatchQuotes(codes: string[]): Promise<RealTimeQuote[]> {
    if (!codes.length) return [];

    // 东方财富批量行情API (免费，无需key)
    const secids = codes.map((c) => {
      const pure = c.replace(/^(sh|sz)/, '');
      return pure.startsWith('6') ? `1.${pure}` : `0.${pure}`;
    }).join(',');

    const url = `https://push2.eastmoney.com/api/qt/ulist.np/get?secids=${secids}&fields=f12,f14,f2,f3,f4,f5,f15,f16,f17,f18`;

    try {
      const resp = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        signal: AbortSignal.timeout(5000),
      });
      if (!resp.ok) return codes.map((c) => this.mockQuote(c));

      const json = await resp.json() as { data: any };
      const list: any[] = json.data?.diff ?? [];
      return list.map((d: any) => ({
        code: d.f12,
        name: d.f14,
        price: d.f2 / 100,
        change: d.f4 / 100,
        changePercent: d.f3 / 100,
        volume: d.f5,
        amount: d.f6 / 100,
        high: d.f15 / 100,
        low: d.f16 / 100,
        open: d.f17 / 100,
        preClose: d.f18 / 100,
        market: d.f12?.startsWith('6') ? 'sh' : 'sz',
      }));
    } catch {
      return codes.map((c) => this.mockQuote(c));
    }
  }

  private mockQuote(code: string): RealTimeQuote {
    const base = this.mockPrice(code);
    const change = this.mockChange();
    return {
      code,
      name: '',
      price: base,
      change,
      changePercent: this.mockChangePercent(),
      volume: this.mockVolume(),
      amount: 0,
      high: base * 1.02,
      low: base * 0.98,
      open: base * 0.99,
      preClose: base - change,
      market: code.startsWith('6') || code.startsWith('sh') ? 'sh' : 'sz',
    };
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
