/**
 * MarketSyncScheduler — 定时调度器
 *
 * 交易时段（工作日 9:30-15:00）定时同步策略：
 *  - 每 1 分钟：实时行情快照
 *  - 每 15 分钟：分钟K线
 * 收盘后（15:05）：日K + 多周期K线
 *
 * 使用 Node.js 内置 setInterval，不依赖任何外部调度库
 */
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { MarketSyncService } from './market-sync.service';
import { SyncTaskType } from '@prisma/client';

@Injectable()
export class MarketSyncScheduler implements OnModuleInit, OnModuleDestroy {
  private timers: ReturnType<typeof setInterval>[] = [];

  constructor(private readonly sync: MarketSyncService) {}

  // 判断当前是否在交易时段（简化版，不考虑午间休市和节假日）
  private isTradingHours(): boolean {
    const now = new Date();
    const day = now.getDay(); // 0=周日, 6=周六
    if (day === 0 || day === 6) return false;

    const h = now.getHours();
    const m = now.getMinutes();
    const totalMin = h * 60 + m;

    // 上午 9:30-11:30，下午 13:00-15:00
    const morningStart = 9 * 60 + 30;   // 570
    const morningEnd   = 11 * 60 + 30;  // 690
    const afternoonStart = 13 * 60;     // 780
    const afternoonEnd   = 15 * 60;     // 900

    return (totalMin >= morningStart && totalMin < morningEnd) ||
           (totalMin >= afternoonStart && totalMin < afternoonEnd);
  }

  // 判断是否在收盘后 5 分钟内（用于日K结算）
  private isPostClose(): boolean {
    const now = new Date();
    const h = now.getHours(), m = now.getMinutes();
    const totalMin = h * 60 + m;
    // 15:00-15:05
    return totalMin >= 15 * 60 && totalMin < 15 * 60 + 5;
  }

  async onModuleInit() {
    // 启动主调度循环
    this.timers.push(setInterval(() => this.tick(), 60_000)); // 每分钟检查一次
    console.log('[MarketSyncScheduler] 已启动');
  }

  async onModuleDestroy() {
    this.timers.forEach(t => clearInterval(t));
    console.log('[MarketSyncScheduler] 已停止');
  }

  private async tick() {
    try {
      if (this.isTradingHours()) {
        // 交易时段：实时行情 + 分钟K线
        await this.sync.enqueue(SyncTaskType.REALTIME_QUOTE, 'ALL', undefined, 100);

        // 每 15 分钟同步一次分钟K线（简化：每第 4 个 tick，即 4 分钟对齐）
        const now = new Date();
        if (now.getMinutes() % 15 === 0) {
          await this.sync.enqueue(SyncTaskType.MINUTE_KLINE, 'ALL', '5min', 50);
        }
      }

      if (this.isPostClose()) {
        // 收盘后：日K + 多周期K线
        await this.sync.enqueue(SyncTaskType.DAILY_KLINE, 'ALL', undefined, 200);
        for (const p of ['week', 'month', 'season', 'year']) {
          await this.sync.enqueue(SyncTaskType.PERIOD_KLINE, 'ALL', p, 150);
        }
      }
    } catch (e) {
      console.error('[MarketSyncScheduler] tick 错误:', e);
    }
  }
}
