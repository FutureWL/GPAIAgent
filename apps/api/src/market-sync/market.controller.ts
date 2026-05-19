/**
 * MarketController — 市场数据 API（供前端页面调用）
 */
import { Controller, Get, Post, Query, BadRequestException } from '@nestjs/common';
import { MarketService } from './market.service';
import { MarketSyncService } from './market-sync.service';
import { SyncTaskType } from '@prisma/client';

@Controller('market')
export class MarketController {
  constructor(
    private readonly market: MarketService,
    private readonly sync: MarketSyncService,
  ) {}

  /** GET /market/quote?code=600519 */
  @Get('quote')
  async getQuote(@Query('code') code: string) {
    if (!code) throw new BadRequestException('缺少 code 参数');
    const quote = await this.market.getQuote(code);
    if (!quote) throw new BadRequestException('股票不存在或暂无行情数据');
    return quote;
  }

  /** GET /market/quotes?codes=600519,000858 */
  @Get('quotes')
  async getBatchQuotes(@Query('codes') codes: string) {
    if (!codes) throw new BadRequestException('缺少 codes 参数');
    const list = codes.split(',').map(c => c.trim()).filter(Boolean);
    return this.market.getBatchQuotes(list);
  }

  /** GET /market/daily?code=600519&count=120 */
  @Get('daily')
  async getDaily(@Query('code') code: string, @Query('count') count = '120') {
    if (!code) throw new BadRequestException('缺少 code 参数');
    return this.market.getDailyKline(code, parseInt(count));
  }

  /** GET /market/kline?code=600519&period=day&count=120 */
  @Get('kline')
  async getKline(
    @Query('code') code: string,
    @Query('period') period = 'day',
    @Query('count') count = '120',
  ) {
    if (!code) throw new BadRequestException('缺少 code 参数');
    if (['day', 'week', 'month', 'season', 'year'].includes(period)) {
      return this.market.getPeriodKline(code, period, parseInt(count));
    }
    if (['1min', '5min', '15min', '30min', '60min'].includes(period)) {
      return this.market.getMinuteKline(code, period, parseInt(count));
    }
    throw new BadRequestException(`不支持的周期: ${period}`);
  }

  /** GET /market/status — 队列状态 */
  @Get('status')
  async getStatus() {
    const [queue, recentJobs] = await Promise.all([
      this.market.getQueueStatus(),
      this.market.getRecentJobs(10),
    ]);
    return { queue, recentJobs };
  }

  /** POST /market/sync — 手动触发同步 */
  @Post('sync')
  async triggerSync(@Query('type') type: string, @Query('target') target = 'ALL', @Query('period') period?: string) {
    const validTypes = Object.values(SyncTaskType);
    if (!validTypes.includes(type as SyncTaskType)) {
      throw new BadRequestException(`type 必须是: ${validTypes.join(', ')}`);
    }
    const id = await this.sync.enqueue(type as SyncTaskType, target, period);
    return { taskId: id, message: '同步任务已加入队列' };
  }
}
