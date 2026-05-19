import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface RealTimeQuote {
  code: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  amount: number;
  turnover: number;
  circulateCap: number;
  totalCap: number;
  netInflow: number;
  high: number;
  low: number;
  open: number;
  preClose: number;
  market: string;
}

export interface KBar {
  date: string;
  open: number;
  close: number;
  high: number;
  low: number;
  volume: number;
}

// 判断市场前缀 sh/sz（与前端 getQtPrefix 保持一致）
function getQtPrefix(code: string): string {
  if (code.startsWith('000') || code.startsWith('399')) return 'sh';
  return code.startsWith('6') || code.startsWith('5') ? 'sh' : 'sz';
}

const MOCK_STOCKS = [
  { code: '600519', name: '贵州茅台', market: 'sh', type: 'stock' },
  { code: '000858', name: '五粮液', market: 'sz', type: 'stock' },
  { code: '600036', name: '招商银行', market: 'sh', type: 'stock' },
  { code: '601318', name: '中国平安', market: 'sh', type: 'stock' },
  { code: '000333', name: '美的集团', market: 'sz', type: 'stock' },
  { code: '002594', name: '比亚迪', market: 'sz', type: 'stock' },
  { code: '600887', name: '伊利股份', market: 'sh', type: 'stock' },
  { code: '000001', name: '上证指数', market: 'sh', type: 'index' },
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

// 腾讯接口 period → 响应数据字段名映射
// season 腾讯不支持，会返回 error
const PERIOD_FIELD_MAP: Record<string, string> = {
  day: 'qfqday',
  week: 'qfqweek',
  month: 'qfqmonth',
  year: 'year',
  // season: 腾讯不支持
};

@Injectable()
export class StocksService {
  constructor(private readonly prismaService: PrismaService) {}

  // 东方财富实时行情API (免费，无需key)
  // 注意：非交易时段 open/high/low/vol 为 0，此时从日K最新一根补全
  private async fetchRealTimeQuote(code: string): Promise<RealTimeQuote | null> {
    const prefix = getQtPrefix(code);
    const secid = prefix === 'sh' ? `1.${code}` : `0.${code}`;
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

      let price = parseFloat((d.f43 / 100).toFixed(2));
      let open = parseFloat((d.f50 / 100).toFixed(2));
      let high = parseFloat((d.f48 / 100).toFixed(2));
      let low = parseFloat((d.f49 / 100).toFixed(2));
      let volume = d.f46 as number;
      let amount = d.f47 as number;

      // 非交易时段 OHLCV 全为 0，从日K最新一根补全
      if (volume === 0 && amount === 0 && high === 0 && low === 0) {
        const todayBars = await this.fetchPeriodKline(code, 'day', 1);
        if (todayBars.length > 0) {
          const bar = todayBars[todayBars.length - 1];
          open = bar.open || open;
          high = bar.high || high;
          low = bar.low || low;
          // 价格用实时数据，K线数据的 close 作为参考
          if (price === 0) price = bar.close;
        }
      }

      return {
        code: d.f57,
        name: d.f58,
        price,
        change: parseFloat((d.f44 / 100).toFixed(2)),
        changePercent: parseFloat((d.f45 / 100).toFixed(2)),
        volume,
        amount,
        turnover: 0,
        circulateCap: 0,
        totalCap: 0,
        netInflow: 0,
        high,
        low,
        open,
        preClose: parseFloat((d.f51 / 100).toFixed(2)),
        market: getQtPrefix(code),
      };
    } catch {
      return null;
    }
  }

  // 从腾讯财经获取日/周/月/年 K线（前复权）
  // period: day | week | month | year
  async fetchPeriodKline(code: string, period: string, count = 240): Promise<KBar[]> {
    const fieldName = PERIOD_FIELD_MAP[period];
    if (!fieldName) return [];

    const qtCode = `${getQtPrefix(code)}${code}`;
    const url = `https://web.ifzq.gtimg.cn/appstock/app/fqkline/get?param=${qtCode},${period},,,${count},qfq`;

    try {
      const resp = await fetch(url, {
        headers: { Referer: 'https://finance.qq.com', 'User-Agent': 'Mozilla/5.0' },
        signal: AbortSignal.timeout(10000),
      });
      if (!resp.ok) return [];

      const json = await resp.json() as { data: Record<string, any> };
      const stockData = json.data?.[qtCode];
      if (!stockData) return [];

      const bars = stockData[fieldName] as string[][];
      if (!Array.isArray(bars) || bars.length === 0) return [];

      return bars.map((bar) => ({
        date: String(bar[0]),
        open: parseFloat(bar[1]) || 0,
        close: parseFloat(bar[2]) || 0,
        high: parseFloat(bar[3]) || 0,
        low: parseFloat(bar[4]) || 0,
        volume: parseFloat(bar[5]) || 0,
      }));
    } catch {
      return [];
    }
  }

  // 从东方财富获取分钟K线（1min/5min/15min/30min/60min）
  // 文档: https://push2his.eastmoney.com/api/qt/stock/kline/get
  // klt: 1=1min, 5=5min, 15=15min, 30=30min, 60=60min
  // fqt=1 前复权
  // 注意: eastmoney 的 IPv6 地址被阻断，必须用 family:4 强制 IPv4
  async fetchMinuteKline(code: string, period: string, count = 300): Promise<KBar[]> {
    const kltMap: Record<string, number> = { '1min': 1, '5min': 5, '15min': 15, '30min': 30, '60min': 60 };
    const klt = kltMap[period];
    if (!klt) return [];

    const prefix = getQtPrefix(code);
    const secid = prefix === 'sh' ? `1.${code}` : `0.${code}`;
    const url = `https://push2his.eastmoney.com/api/qt/stock/kline/get?secid=${secid}&fields1=f1,f2,f3,f4,f5,f6&fields2=f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61&klt=${klt}&fqt=1&beg=0&end=20500101&lmt=${count}`;

    try {
      const https = await import('https');
      const agent = new https.Agent({ family: 4 });

      // 带指数退避的请求，最多 3 次
      let body = '';
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          body = await new Promise<string>((resolve, reject) => {
            const req = https.get(url, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Referer': 'https://www.eastmoney.com/',
                'Accept-Language': 'zh-CN,zh;q=0.9',
              },
              agent,
            }, (res) => {
              let data = '';
              res.on('data', chunk => data += chunk);
              res.on('end', () => resolve(data));
            });
            req.setTimeout(8000, () => { req.destroy(); reject(new Error('timeout')); });
            req.on('error', reject);
          });
          break; // 成功则退出重试
        } catch (e) {
          if (attempt === 2) throw e;
          await new Promise(r => setTimeout(r, 500 * (attempt + 1)));
        }
      }
      const json = JSON.parse(body);
      const klines: string[] = json.data?.klines ?? [];
      if (klines.length === 0) return [];

      return klines.map((k) => {
        const parts = k.split(',');
        return {
          date: String(parts[0]),
          open: parseFloat(parts[1]) || 0,
          close: parseFloat(parts[2]) || 0,
          high: parseFloat(parts[3]) || 0,
          low: parseFloat(parts[4]) || 0,
          volume: parseFloat(parts[5]) || 0,
        };
      });
    } catch {
      return [];
    }
  }

  // 获取分时数据（当日分钟线 + 成交量）
  async fetchTodayMinute(code: string): Promise<{ points: { time: string; price: number; volume: number }[]; preClose: number }> {
    const qtCode = `${getQtPrefix(code)}${code}`;
    const url = `https://web.ifzq.gtimg.cn/appstock/app/minute/query?code=${qtCode}`;

    try {
      const resp = await fetch(url, {
        headers: { Referer: 'https://finance.qq.com', 'User-Agent': 'Mozilla/5.0' },
        signal: AbortSignal.timeout(10000),
      });
      if (!resp.ok) return { points: [], preClose: 0 };

      const json = await resp.json() as { data: Record<string, any> };
      const qtData = json.data?.[qtCode]?.data;
      if (!qtData) return { points: [], preClose: 0 };

      const preClose = qtData.preClose || 0;
      const raw = qtData.data;
      if (!Array.isArray(raw) || raw.length === 0) return { points: [], preClose };

      const points: { time: string; price: number; volume: number }[] = [];
      let prevVol = 0;
      for (const line of raw) {
        const pts = String(line).trim().split(/\s+/);
        if (pts.length < 3) continue;
        const [h, m] = pts[0].split(':');
        const price = parseFloat(pts[1]) || 0;
        const cumVol = parseInt(pts[2]) || 0;
        const volume = cumVol - prevVol;
        prevVol = cumVol;
        points.push({ time: `${h}:${m}`, price, volume: Math.max(0, volume) });
      }
      return { points, preClose };
    } catch {
      return { points: [], preClose: 0 };
    }
  }

  // 获取5日分时（包含多个交易日）
  async fetch5DayMinute(code: string): Promise<{ points: { time: string; price: number; volume: number }[]; preClose: number }> {
    const qtCode = `${getQtPrefix(code)}${code}`;
    // minutedata 是变量赋值格式: minutedata={...}
    const url = `https://web.ifzq.gtimg.cn/appstock/app/minute/query?_var=minutedata&code=${qtCode}`;

    try {
      const resp = await fetch(url, {
        headers: { Referer: 'https://finance.qq.com', 'User-Agent': 'Mozilla/5.0' },
        signal: AbortSignal.timeout(10000),
      });
      if (!resp.ok) return { points: [], preClose: 0 };

      const text = await resp.text();
      // 格式: minutedata={...}
      const match = text.match(/=\s*(\{.*\})/);
      if (!match) return { points: [], preClose: 0 };

      const json = JSON.parse(match[1]) as { data: Record<string, any> };
      const qtData = json.data?.[qtCode]?.data;
      if (!qtData) return { points: [], preClose: 0 };

      const preClose = qtData.preClose || 0;
      const days: string[] = qtData.days || [];
      const allPoints: { time: string; price: number; volume: number }[] = [];

      for (const day of days) {
        const dayData = qtData[day];
        if (!Array.isArray(dayData)) continue;
        let prevVol = 0;
        for (const line of dayData) {
          const pts = String(line).trim().split(/\s+/);
          if (pts.length < 3) continue;
          const [h, m] = pts[0].split(':');
          const price = parseFloat(pts[1]) || 0;
          const cumVol = parseInt(pts[2]) || 0;
          const volume = cumVol - prevVol;
          prevVol = cumVol;
          allPoints.push({ time: `${day} ${h}:${m}`, price, volume: Math.max(0, volume) });
        }
      }
      return { points: allPoints, preClose };
    } catch {
      return { points: [], preClose: 0 };
    }
  }

  // 综合K线查询：优先读数据库，数据库不够则调API补缺
  // period: minute | 5day | day | week | month | season | year | 1min | 5min | 15min | 30min | 60min
  async getStockKline(code: string, period: string, count = 120): Promise<KBar[]> {
    // minute / 5day 是实时分时，不入库
    if (period === 'minute') {
      const { points } = await this.fetchTodayMinute(code);
      if (points.length > 0) {
        return points.map(p => ({ date: p.time, open: p.price, close: p.price, high: p.price, low: p.price, volume: p.volume }));
      }
      // Fallback: 外部 API 不可达时，从 DB 日K数据构建近似分时
      return this.klineFromDailyDb(code, 'day', count);
    }
    if (period === '5day') {
      const { points } = await this.fetch5DayMinute(code);
      if (points.length > 0) {
        return points.map(p => ({ date: p.time, open: p.price, close: p.price, high: p.price, low: p.price, volume: p.volume }));
      }
      // Fallback: 从 DB 日K数据构建近似分时
      return this.klineFromDailyDb(code, '5day', count);
    }

    // 分钟周期: 1min/5min/15min/30min/60min
    if (['1min', '5min', '15min', '30min', '60min'].includes(period)) {
      return this.fetchMinuteKline(code, period, count);
    }

    // 日K: 直接调腾讯接口（不入库）
    if (period === 'day') {
      return this.fetchPeriodKline(code, 'day', count);
    }

    // 季K: 将月K数据按季度聚合（腾讯不支持season周期）
    if (period === 'season') {
      const monthBars = await this.fetchPeriodKline(code, 'month', count * 3);
      return aggregateBySeason(monthBars);
    }

    // 周/月/年: 先查 DB，再补缺
    const dbRecords = await this.prismaService.stockPeriodKline.findMany({
      where: { stockId: { in: (await this.prismaService.stock.findMany({ where: { code }, select: { id: true } })).map(s => s.id) }, period },
      orderBy: { date: 'asc' },
      take: count,
    });
    let dbBars = dbRecords.map(r => ({
      date: r.date.toISOString().slice(0, 10),
      open: r.open, close: r.close, high: r.high, low: r.low, volume: r.volume,
    }));
    if (dbBars.length < count) {
      const apiBars = await this.fetchPeriodKline(code, period, count);
      if (apiBars.length > 0) {
        const dates = new Set(dbBars.map(b => b.date));
        const newBars = apiBars.filter(b => !dates.has(b.date));
        dbBars = [...dbBars, ...newBars].slice(-count);
      }
    }
    return dbBars;
  }

  // minute/5day 外部 API 不可达时，从 DB stockDaily 数据构建近似 KBar 列表
  // minute: 将 stockDaily 数据每条展开为一个"分时点"（开盘时刻，close 价格）
  // 5day: 将多个交易日 stockDaily 串联，每条日K展开为一个分时点
  private async klineFromDailyDb(code: string, period: 'day' | '5day', count = 120): Promise<KBar[]> {
    const stock = await this.prismaService.stock.findUnique({ where: { code } });
    if (!stock) return [];

    const dbRecords = await this.prismaService.stockDaily.findMany({
      where: { stockId: stock.id },
      orderBy: { date: 'desc' },
      take: period === '5day' ? 5 : 1,
    });
    if (dbRecords.length === 0) return [];

    // 每条日K转为一个分时点（date + 09:30 = 开盘时刻，close 价格）
    return dbRecords
      .map(r => ({
        date: `${r.date.toISOString().slice(0, 10)} 09:30`,
        open: r.close,
        close: r.close,
        high: r.close,
        low: r.close,
        volume: r.volume,
      }))
      .slice(0, count);
  }

  // 实时行情（供 /stocks/:code/quote 路由使用）
  // 外部行情接口失败时，从数据库取最新日K数据作为 fallback
  async getRealtimeQuote(code: string): Promise<RealTimeQuote | null> {
    const qt = await this.fetchRealTimeQuote(code);
    if (qt) return qt;

    // Fallback 1: 从 DB 取最新日K数据
    const stock = await this.prismaService.stock.findUnique({ where: { code } });
    if (!stock) return null;

    const bars = await this.prismaService.stockPeriodKline.findMany({
      where: { stockId: stock.id, period: 'day' },
      orderBy: { date: 'desc' },
      take: 1,
    });
    const lastBar = bars[0];

    // Fallback 2: 从 StockQuote 取最新快照（MarketSyncService 定时同步的实时数据）
    const latestQuote = await this.prismaService.stockQuote.findFirst({
      where: { stockId: stock.id },
      orderBy: { capturedAt: 'desc' },
    });

    // StockQuote 字段更完整，优先使用
    if (latestQuote) {
      return {
        code: stock.code,
        name: stock.name,
        price: latestQuote.price,
        change: latestQuote.change,
        changePercent: latestQuote.changePct,
        volume: latestQuote.volume,
        amount: latestQuote.amount,
        turnover: latestQuote.turnover ?? 0,
        circulateCap: latestQuote.circulateCap ?? 0,
        totalCap: latestQuote.marketCap ?? 0,
        netInflow: latestQuote.netInflow ?? 0,
        high: latestQuote.high,
        low: latestQuote.low,
        open: latestQuote.open,
        preClose: latestQuote.preClose,
        market: stock.market,
      };
    }

    // Fallback 3: stock 表自身的价格字段（市场同步时写入的最近价）
    // Prisma Stock 类型不包含这些字段，用 any 断言绕过（Schema 后续扩展后会移除）
    const s = stock as any;

    return {
      code: stock.code,
      name: stock.name,
      price: lastBar ? lastBar.close : (s.price ?? 0),
      change: s.change ?? 0,
      changePercent: s.changePercent ?? 0,
      volume: lastBar ? lastBar.volume : (s.volume ?? 0),
      amount: 0,
      turnover: 0,
      circulateCap: 0,
      totalCap: 0,
      netInflow: 0,
      high: lastBar ? lastBar.high : 0,
      low: lastBar ? lastBar.low : 0,
      open: lastBar ? lastBar.open : 0,
      preClose: lastBar ? lastBar.close : (s.price ?? 0),
      market: stock.market,
    };
  }

  // 确保股票在数据库中存在
  async ensureStock(code: string, name: string, market: string, type = 'stock') {
    return this.prismaService.stock.upsert({
      where: { code },
      create: { code, name, market, type },
      update: {},
    });
  }

  // 搜索股票
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

    const candidates = new Map<string, { code: string; name: string; market: string; type: string }>();
    for (const s of dbStocks) candidates.set(s.code, s);

    if (candidates.size < 20) {
      for (const mock of MOCK_STOCKS) {
        if (candidates.size >= 20) break;
        if (mock.code.includes(q.toUpperCase()) || mock.name.includes(q) || q.length < 3) {
          candidates.set(mock.code, mock);
        }
      }
    }

    if (candidates.size === 0) return [];

    const codes = [...candidates.keys()];
    const quotes = await this.getBatchQuotes(codes);
    const quoteMap = new Map(quotes.map((qt) => [qt.code.replace(/^(sh|sz)/, ''), qt]));

    return [...candidates.values()].map((s) => {
      const qt = quoteMap.get(s.code);
      return {
        code: s.code,
        name: qt?.name || s.name,
        price: qt?.price ?? 0,
        change: qt?.change ?? 0,
        changePercent: qt?.changePercent ?? 0,
        volume: qt?.volume ?? 0,
      };
    });
  }

  // 获取单只股票详情
  async getByCode(code: string) {
    const mock = MOCK_STOCKS.find((s) => s.code === code);
    if (mock) {
      await this.ensureStock(mock.code, mock.name, mock.market, mock.type);
    }

    const stock = await this.prismaService.stock.findUnique({ where: { code } });
    if (!stock) {
      throw new NotFoundException('股票不存在');
    }

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

    if (userStocks.length === 0) return [];

    const codes = userStocks.map((us) => us.stock.code);
    const quotes = await this.getBatchQuotes(codes);
    const quoteMap = new Map(quotes.map((q) => [q.code.replace(/^(sh|sz)/, ''), q]));

    return userStocks.map((us) => {
      const qt = quoteMap.get(us.stock.code) ?? this.mockQuote(us.stock.code);
      return {
        addedAt: us.addedAt,
        stock: {
          code: us.stock.code,
          name: qt.name || us.stock.name,
          price: qt.price,
          change: qt.change,
          changePercent: qt.changePercent,
          volume: qt.volume,
        },
      };
    });
  }

  async addUserStock(userId: string, stockCode: string) {
    const cleanCode = stockCode.replace(/^(sh|sz)/, '');

    let stock = await this.prismaService.stock.findUnique({ where: { code: cleanCode } });

    if (!stock) {
      const qt = await this.fetchRealTimeQuote(cleanCode);
      if (!qt) {
        const mock = MOCK_STOCKS.find((s) => s.code === cleanCode);
        if (!mock) throw new NotFoundException('股票不存在');
        stock = await this.ensureStock(mock.code, mock.name, mock.market, mock.type);
      } else {
        stock = await this.ensureStock(cleanCode, qt.name, qt.market, 'stock');
      }
    }

    try {
      await this.prismaService.userStock.create({
        data: { userId, stockId: stock.id },
      });
    } catch { /* already exists */ }

    return { success: true, stockCode: cleanCode };
  }

  async removeUserStock(userId: string, stockCode: string) {
    const stock = await this.prismaService.stock.findUnique({ where: { code: stockCode } });
    if (!stock) return { success: true };
    await this.prismaService.userStock.deleteMany({
      where: { userId, stockId: stock.id },
    });
    return { success: true };
  }

  // 获取股票日线历史数据（从本地数据库）
  async getStockDaily(stockCode: string, days = 250) {
    const stock = await this.prismaService.stock.findUnique({ where: { code: stockCode } });
    if (!stock) throw new NotFoundException('股票不存在');

    const records = await this.prismaService.stockDaily.findMany({
      where: { stockId: stock.id },
      orderBy: { date: 'desc' },
      take: days,
    });

    return records.reverse().map((r) => ({
      date: r.date.toISOString().slice(0, 10),
      open: r.open,
      close: r.close,
      high: r.high,
      low: r.low,
      volume: r.volume,
    }));
  }

  // 批量获取实时行情
  async getBatchQuotes(codes: string[]): Promise<RealTimeQuote[]> {
    if (!codes.length) return [];

    // 用完整前缀的代码请求腾讯，保留 sh/sz 前缀以区分指数和股票
    // sh 前缀的 000xxx 是指数（如 sh000001 = 上证指数），保留 sh；
    // sz 前缀的 000xxx 是股票（如 sz000001 = 平安银行），保留 sz；
    const qtCodes = codes.map((c) => {
      const pure = c.replace(/^(sh|sz)/, '');
      const isIndex = c.startsWith('sh') && pure.startsWith('000');
      const isSzStock = c.startsWith('sz');
      if (isIndex) return `sh${pure}`;
      if (isSzStock) return `sz${pure}`;
      return pure.startsWith('6') || pure.startsWith('5') ? `sh${pure}` : `sz${pure}`;
    });
    const url = `https://qt.gtimg.cn/q=${qtCodes.join(',')}`;

    try {
      const resp = await fetch(url, {
        headers: { Referer: 'https://finance.qq.com', 'User-Agent': 'Mozilla/5.0' },
        signal: AbortSignal.timeout(10000),
      });
      if (!resp.ok) return codes.map((c) => this.mockQuote(c.replace(/^(sh|sz)/, '')));

      const buffer = await resp.arrayBuffer();
      const text = new TextDecoder('gbk').decode(Buffer.from(buffer));
      const lines = text.trim().split('\n');

      const results: RealTimeQuote[] = [];
      for (const line of lines) {
        if (!line.trim()) continue;
        const eqIdx = line.indexOf('=');
        if (eqIdx < 0) continue;
        // 从行首提取完整代码前缀，如 v_sh000001 → sh000001
        const linePrefix = line.substring(0, eqIdx); // e.g. "v_sh000001"
        const fullCode = linePrefix.replace(/^v_/, ''); // e.g. "sh000001"
        const dataStr = line.substring(eqIdx + 2);
        const parts = dataStr.split('~');
        if (parts.length < 35) continue;

        const price = parseFloat(parts[3]) || 0;
        const preClose = parseFloat(parts[4]) || 0;
        const open = parseFloat(parts[5]) || 0;
        const volume = parseInt(parts[6]) || 0;
        const amount = parseFloat(parts[36]) || 0;
        const change = parseFloat(parts[31]) || 0;
        const changePercent = parseFloat(parts[32]) || 0;
        const high = parseFloat(parts[34]) || 0;
        const low = parseFloat(parts[35]) || 0;
        const turnover = parseFloat(parts[43]) || 0;
        const totalCap = parseFloat(parts[44]) || 0;
        const circulateCap = parseFloat(parts[45]) || 0;
        const netInflow = parseFloat(parts[74]) || 0;
        const market = fullCode.startsWith('sh') ? 'sh' : 'sz';

        results.push({
          code: fullCode, name: parts[1], price, change, changePercent,
          volume, amount, turnover, circulateCap, totalCap, netInflow,
          high, low, open, preClose, market,
        });
      }

      // 按 fullCode 去重（避免 sz000001 和 sh000001 请求时 qt 转换后变成重复的 sh000001）
      const seen = new Set<string>();
      const deduped = results.filter((r) => {
        if (seen.has(r.code)) return false;
        seen.add(r.code);
        return true;
      });

      return deduped;
    } catch {
      return codes.map((c) => this.mockQuote(c.replace(/^(sh|sz)/, '')));
    }
  }

  private mockQuote(code: string): RealTimeQuote {
    const base = this.mockPrice(code);
    const change = this.mockChange();
    return {
      code, name: '', price: base, change,
      changePercent: this.mockChangePercent(), volume: this.mockVolume(),
      amount: 0, turnover: 0, circulateCap: 0, totalCap: 0, netInflow: 0,
      high: base * 1.02, low: base * 0.98, open: base * 0.99,
      preClose: base - change,
      market: code.startsWith('6') || code.startsWith('sh') ? 'sh' : 'sz',
    };
  }

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

// 将月K线聚合成季K线
function aggregateBySeason(monthBars: KBar[]): KBar[] {
  if (monthBars.length === 0) return [];

  const seasonMap = new Map<string, KBar>();

  for (const bar of monthBars) {
    const date = new Date(bar.date);
    const year = date.getFullYear();
    const month = date.getMonth(); // 0-11
    // 季: 0-2=Q1, 3-5=Q2, 6-8=Q3, 9-11=Q4
    const quarter = Math.floor(month / 3) + 1;
    const key = `${year}-Q${quarter}`;

    const existing = seasonMap.get(key);
    if (!existing) {
      seasonMap.set(key, { date: key, open: bar.open, close: bar.close, high: bar.high, low: bar.low, volume: bar.volume });
    } else {
      existing.high = Math.max(existing.high, bar.high);
      existing.low = Math.min(existing.low, bar.low);
      existing.close = bar.close;
      existing.volume += bar.volume;
    }
  }

  return [...seasonMap.values()].sort((a, b) => a.date.localeCompare(b.date));
}
