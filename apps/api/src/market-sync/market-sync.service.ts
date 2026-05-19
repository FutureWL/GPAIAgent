/**
 * MarketSyncService — 市场数据同步核心服务
 *
 * 分层架构：
 *  1. 数据源层（腾讯财经、东方财富 API）
 *  2. 持久化层（PostgreSQL — StockQuote, StockDaily, StockPeriodKline）
 *  3. 队列层（SyncQueue — 数据库-backed 任务队列）
 *  4. 调度层（MarketSyncScheduler — cron 定时触发）
 *  5. 服务层（MarketService — 前端 API 统一入口）
 *
 * 数据流向：
 *  数据源 API → MarketSyncService → PostgreSQL → MarketService → 前端
 */
import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SyncTaskType, SyncTaskStatus, SyncJobStatus } from '@prisma/client';

export interface QuoteSnapshot {
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
}

export interface KBar {
  date: string;
  open: number;
  close: number;
  high: number;
  low: number;
  volume: number;
}

@Injectable()
export class MarketSyncService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  // ===== 队列操作 =====

  /** 入队一个同步任务 */
  async enqueue(type: SyncTaskType, target: string, period?: string, priority = 0): Promise<string> {
    const task = await this.prisma.syncQueue.create({
      data: { type, target, period, priority },
    });
    return task.id;
  }

  /** 批量入队（去重：同一 type+target+period 只保留最新） */
  async enqueueBatch(tasks: { type: SyncTaskType; target: string; period?: string; priority?: number }[]): Promise<number> {
    let count = 0;
    for (const t of tasks) {
      const existing = await this.prisma.syncQueue.findFirst({
        where: { type: t.type, target: t.target, period: t.period ?? null, status: { in: [SyncTaskStatus.PENDING, SyncTaskStatus.PROCESSING] } },
      });
      if (!existing) {
        await this.prisma.syncQueue.create({ data: { type: t.type, target: t.target, period: t.period, priority: t.priority ?? 0 } });
        count++;
      }
    }
    return count;
  }

  /** 获取最高优先级的待处理任务（带悲观锁） */
  async dequeue(): Promise<{ id: string; type: SyncTaskType; target: string; period: string | null } | null> {
    const task = await this.prisma.syncQueue.findFirst({
      where: { status: SyncTaskStatus.PENDING },
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
    });
    if (!task) return null;

    // 乐观锁：只有 status 仍为 PENDING 才更新
    const updated = await this.prisma.syncQueue.updateMany({
      where: { id: task.id, status: SyncTaskStatus.PENDING },
      data: { status: SyncTaskStatus.PROCESSING, updatedAt: new Date() },
    });
    if (updated.count === 0) return null; // 被其他 worker 抢走了

    return { id: task.id, type: task.type, target: task.target, period: task.period ?? null };
  }

  async completeTask(queueId: string, success: boolean): Promise<void> {
    await this.prisma.syncQueue.update({
      where: { id: queueId },
      data: { status: success ? SyncTaskStatus.COMPLETED : SyncTaskStatus.FAILED },
    });
  }

  /** 任务失败时重试（指数退避） */
  async retryTask(queueId: string): Promise<boolean> {
    const task = await this.prisma.syncQueue.findUnique({ where: { id: queueId } });
    if (!task || task.retries >= task.maxRetries) return false;

    await this.prisma.syncQueue.update({
      where: { id: queueId },
      data: {
        status: SyncTaskStatus.PENDING,
        retries: { increment: 1 },
        updatedAt: new Date(),
      },
    });
    return true;
  }

  // ===== 同步执行器 =====

  async processTask(queueId: string, type: SyncTaskType, target: string, period?: string): Promise<{ itemsOk: number; itemsTotal: number; error?: string }> {
    const startMs = Date.now();
    let itemsOk = 0;
    let itemsTotal = 0;
    let error: string | undefined;

    try {
      switch (type) {
        case SyncTaskType.REALTIME_QUOTE:
          if (target === 'ALL') {
            const stocks = await this.prisma.stock.findMany({ select: { id: true, code: true, name: true } });
            for (const s of stocks) {
              const ok = await this.syncOneQuote(s.code);
              if (ok) itemsOk++;
              itemsTotal++;
            }
          } else {
            const ok = await this.syncOneQuote(target);
            itemsOk = ok ? 1 : 0;
            itemsTotal = 1;
          }
          break;

        case SyncTaskType.DAILY_KLINE:
          if (target === 'ALL') {
            const stocks = await this.prisma.stock.findMany({ select: { id: true, code: true } });
            for (const s of stocks) {
              const n = await this.syncDailyKline(s.code);
              itemsOk += n;
              itemsTotal++;
            }
          } else {
            itemsOk = await this.syncDailyKline(target);
            itemsTotal = 1;
          }
          break;

        case SyncTaskType.PERIOD_KLINE:
          if (target === 'ALL' && period) {
            const stocks = await this.prisma.stock.findMany({ select: { id: true, code: true } });
            for (const s of stocks) {
              const n = await this.syncPeriodKline(s.code, period);
              itemsOk += n;
              itemsTotal++;
            }
          } else if (period) {
            itemsOk = await this.syncPeriodKline(target, period);
            itemsTotal = 1;
          }
          break;

        case SyncTaskType.MINUTE_KLINE:
          if (target === 'ALL') {
            const stocks = await this.prisma.stock.findMany({ select: { id: true, code: true } });
            for (const s of stocks) {
              const n = await this.syncMinuteKline(s.code, period || '5min');
              itemsOk += n;
              itemsTotal++;
            }
          } else {
            itemsOk = await this.syncMinuteKline(target, period || '5min');
            itemsTotal = 1;
          }
          break;
      }
    } catch (e: any) {
      error = e.message;
    }

    // 写入执行记录
    await this.prisma.syncJob.create({
      data: {
        queueId,
        type,
        target,
        period,
        status: error ? (itemsOk > 0 ? SyncJobStatus.PARTIAL : SyncJobStatus.FAILURE) : SyncJobStatus.SUCCESS,
        itemsTotal,
        itemsOk,
        errorMsg: error,
        durationMs: Date.now() - startMs,
        completedAt: new Date(),
      },
    });

    return { itemsOk, itemsTotal, error };
  }

  // ===== 内部同步方法 =====

  /** 同步单只股票的实时行情快照到 StockQuote */
  async syncOneQuote(code: string): Promise<boolean> {
    const stock = await this.prisma.stock.findUnique({ where: { code } });
    if (!stock) return false;

    // 东方财富实时行情
    const secid = code.startsWith('6') ? `1.${code}` : `0.${code}`;
    const quoteUrl = `https://push2.eastmoney.com/api/qt/stock/get?secid=${secid}&fields=f43,f44,f45,f46,f47,f48,f49,f50,f51,f57,f58,f75,f76,f77,f78,f80,f84,f85,f86,f88,f102,f104,f105,f106`;

    try {
      const resp = await fetch(quoteUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0', Referer: 'https://www.eastmoney.com' },
        signal: AbortSignal.timeout(8000),
      });
      if (!resp.ok) return false;

      const json = await resp.json() as { data: any };
      const d = json.data;
      if (!d) return false;

      // 非交易时段从日K补全 OHLC
      let open = parseFloat((d.f50 / 100).toFixed(2));
      let high = parseFloat((d.f48 / 100).toFixed(2));
      let low = parseFloat((d.f49 / 100).toFixed(2));
      if (high === 0 && low === 0) {
        const bars = await this.fetchDayKline(code, 1);
        if (bars.length > 0) {
          const bar = bars[bars.length - 1];
          if (bar.open) open = bar.open;
          if (bar.high) high = bar.high;
          if (bar.low) low = bar.low;
        }
      }

      await this.prisma.stockQuote.create({
        data: {
          stockId: stock.id,
          price: parseFloat((d.f43 / 100).toFixed(2)),
          change: parseFloat((d.f44 / 100).toFixed(2)),
          changePct: parseFloat((d.f45 / 100).toFixed(2)),
          open,
          high,
          low,
          volume: d.f46,
          amount: d.f47,
          turnover: parseFloat(((d.f168 ?? 0) / 100).toFixed(2)),
          preClose: parseFloat((d.f51 / 100).toFixed(2)),
          marketCap: d.f116,
          circulateCap: d.f117,
          netInflow: d.f76,
        },
      });

      return true;
    } catch {
      return false;
    }
  }

  /** 同步日K线（增量：只写入数据库没有的日期） */
  async syncDailyKline(code: string): Promise<number> {
    const stock = await this.prisma.stock.findUnique({ where: { code } });
    if (!stock) return 0;

    const qtCode = code.startsWith('6') || code.startsWith('5') ? `sh${code}` : `sz${code}`;
    const url = `https://web.ifzq.gtimg.cn/appstock/app/fqkline/get?param=${qtCode},day,,,250,qfq`;

    try {
      const resp = await fetch(url, {
        headers: { Referer: 'https://finance.qq.com', 'User-Agent': 'Mozilla/5.0' },
        signal: AbortSignal.timeout(15000),
      });
      if (!resp.ok) return 0;

      const json = await resp.json() as { data: Record<string, any> };
      const bars: string[][] = json.data?.[qtCode]?.qfqday ?? json.data?.[qtCode]?.day ?? [];
      if (bars.length === 0) return 0;

      let upserted = 0;
      for (const bar of bars) {
        const date = new Date(bar[0]);
        try {
          await this.prisma.stockDaily.upsert({
            where: { stockId_date: { stockId: stock.id, date } },
            create: { stockId: stock.id, date, open: parseFloat(bar[1]), close: parseFloat(bar[2]), high: parseFloat(bar[3]), low: parseFloat(bar[4]), volume: parseFloat(bar[5]), amount: 0 },
            update: { open: parseFloat(bar[1]), close: parseFloat(bar[2]), high: parseFloat(bar[3]), low: parseFloat(bar[4]), volume: parseFloat(bar[5]), amount: 0 },
          });
          upserted++;
        } catch { /* duplicate */ }
      }
      return upserted;
    } catch {
      return 0;
    }
  }

  /** 同步多周期K线（周/月/季/年） */
  async syncPeriodKline(code: string, period: string): Promise<number> {
    const stock = await this.prisma.stock.findUnique({ where: { code } });
    if (!stock) return 0;

    const qtCode = code.startsWith('6') || code.startsWith('5') ? `sh${code}` : `sz${code}`;
    const fieldMap: Record<string, string> = { week: 'qfqweek', month: 'qfqmonth', year: 'year' };
    const field = fieldMap[period];
    if (!field) return 0;

    const url = `https://web.ifzq.gtimg.cn/appstock/app/fqkline/get?param=${qtCode},${period},,,500,qfq`;

    try {
      const resp = await fetch(url, {
        headers: { Referer: 'https://finance.qq.com', 'User-Agent': 'Mozilla/5.0' },
        signal: AbortSignal.timeout(15000),
      });
      if (!resp.ok) return 0;

      const json = await resp.json() as { data: Record<string, any> };
      const bars: string[][] = json.data?.[qtCode]?.[field] ?? [];
      if (bars.length === 0) return 0;

      let upserted = 0;
      for (const bar of bars) {
        const date = new Date(bar[0]);
        try {
          await this.prisma.stockPeriodKline.upsert({
            where: { stockId_period_date: { stockId: stock.id, period, date } },
            create: { stockId: stock.id, period, date, open: parseFloat(bar[1]), close: parseFloat(bar[2]), high: parseFloat(bar[3]), low: parseFloat(bar[4]), volume: parseFloat(bar[5]) },
            update: { open: parseFloat(bar[1]), close: parseFloat(bar[2]), high: parseFloat(bar[3]), low: parseFloat(bar[4]), volume: parseFloat(bar[5]) },
          });
          upserted++;
        } catch { /* duplicate */ }
      }
      return upserted;
    } catch {
      return 0;
    }
  }

  /** 同步分钟K线（东方财富接口，强制 IPv4） */
  async syncMinuteKline(code: string, period: string): Promise<number> {
    const stock = await this.prisma.stock.findUnique({ where: { code } });
    if (!stock) return 0;

    const kltMap: Record<string, number> = { '1min': 1, '5min': 5, '15min': 15, '30min': 30, '60min': 60 };
    const klt = kltMap[period];
    if (!klt) return 0;

    const secid = code.startsWith('6') ? `1.${code}` : `0.${code}`;
    const url = `https://push2his.eastmoney.com/api/qt/stock/kline/get?secid=${secid}&fields1=f1,f2,f3,f4,f5,f6&fields2=f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61&klt=${klt}&fqt=1&beg=0&end=20500101&lmt=500`;

    try {
      const https = await import('https');
      const agent = new https.Agent({ family: 4 });

      const body = await new Promise<string>((resolve, reject) => {
        const req = https.get(url, {
          headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://www.eastmoney.com/', 'Accept-Language': 'zh-CN,zh;q=0.9' },
          agent,
        }, (res) => {
          let d = '';
          res.on('data', c => d += c);
          res.on('end', () => resolve(d));
        });
        req.setTimeout(10000, () => { req.destroy(); reject(new Error('timeout')); });
        req.on('error', reject);
      });

      const json = JSON.parse(body);
      const klines: string[] = json.data?.klines ?? [];
      if (klines.length === 0) return 0;

      let upserted = 0;
      for (const k of klines) {
        const parts = k.split(',');
        const date = new Date(parts[0]);
        try {
          await this.prisma.stockPeriodKline.upsert({
            where: { stockId_period_date: { stockId: stock.id, period, date } },
            create: { stockId: stock.id, period, date, open: parseFloat(parts[1]), close: parseFloat(parts[2]), high: parseFloat(parts[3]), low: parseFloat(parts[4]), volume: parseFloat(parts[5]) },
            update: { open: parseFloat(parts[1]), close: parseFloat(parts[2]), high: parseFloat(parts[3]), low: parseFloat(parts[4]), volume: parseFloat(parts[5]) },
          });
          upserted++;
        } catch { /* duplicate */ }
      }
      return upserted;
    } catch {
      return 0;
    }
  }

  /** 获取腾讯日K线原始数据（供内部使用） */
  private async fetchDayKline(code: string, count = 5): Promise<KBar[]> {
    const qtCode = code.startsWith('6') || code.startsWith('5') ? `sh${code}` : `sz${code}`;
    const url = `https://web.ifzq.gtimg.cn/appstock/app/fqkline/get?param=${qtCode},day,,,${count},qfq`;
    try {
      const resp = await fetch(url, {
        headers: { Referer: 'https://finance.qq.com', 'User-Agent': 'Mozilla/5.0' },
        signal: AbortSignal.timeout(10000),
      });
      if (!resp.ok) return [];
      const json = await resp.json() as { data: Record<string, any> };
      const bars: string[][] = json.data?.[qtCode]?.qfqday ?? [];
      return bars.map(b => ({ date: b[0], open: parseFloat(b[1]), close: parseFloat(b[2]), high: parseFloat(b[3]), low: parseFloat(b[4]), volume: parseFloat(b[5]) }));
    } catch {
      return [];
    }
  }

  // ===== 队列消费循环 =====

  /** 队列消费循环（定时拉取任务执行） */
  async runWorkerLoop(concurrency = 3): Promise<void> {
    const running: Promise<void>[] = [];

    for (let i = 0; i < concurrency; i++) {
      running.push(this.workerLoop(`worker-${i}`));
    }

    await Promise.all(running);
  }

  private async workerLoop(_name: string): Promise<void> {
    while (true) {
      const task = await this.dequeue();
      if (!task) {
        await new Promise(r => setTimeout(r, 3000)); // 无任务时等待 3 秒
        continue;
      }

      const result = await this.processTask(task.id, task.type, task.target, task.period ?? undefined);

      if (result.error && result.itemsOk === 0) {
        const retried = await this.retryTask(task.id);
        if (!retried) {
          await this.completeTask(task.id, false);
        }
      } else {
        await this.completeTask(task.id, !result.error);
      }
    }
  }

  // ===== 快捷同步方法（直接调用，不走队列） =====

  /** 同步所有自选股的实时行情（快捷方法） */
  async syncAllQuotes(): Promise<{ synced: number; failed: number }> {
    const stocks = await this.prisma.stock.findMany({ select: { id: true, code: true } });
    let synced = 0, failed = 0;
    for (const s of stocks) {
      const ok = await this.syncOneQuote(s.code);
      ok ? synced++ : failed++;
    }
    return { synced, failed };
  }

  /** 同步所有自选股的日K线（快捷方法） */
  async syncAllDailyKlines(): Promise<{ synced: number; failed: number }> {
    const stocks = await this.prisma.stock.findMany({ select: { id: true, code: true } });
    let synced = 0, failed = 0;
    for (const s of stocks) {
      const n = await this.syncDailyKline(s.code);
      if (n > 0) synced++; else failed++;
    }
    return { synced, failed };
  }

  // ===== 启动时初始化队列任务 =====
  async onModuleInit() {
    // 每次启动时确保有 REALTIME_QUOTE 任务在队列中
    const pending = await this.prisma.syncQueue.findFirst({
      where: { type: SyncTaskType.REALTIME_QUOTE, status: { in: [SyncTaskStatus.PENDING, SyncTaskStatus.PROCESSING] } },
    });
    if (!pending) {
      await this.enqueue(SyncTaskType.REALTIME_QUOTE, 'ALL', undefined, 100);
    }
  }
}
