import { Controller, Get, Post, Delete, Param, Query, Body, UseGuards, Req } from '@nestjs/common';
import { StocksService } from './stocks.service';
import { JwtCookieAuthGuard, AuthedRequest } from '../auth/auth.guard';
import { AddUserStockDto } from './dto/add-user-stock.dto';

@Controller('stocks')
export class StocksController {
  constructor(private readonly stocksService: StocksService) {}

  @Get('search')
  search(@Query('q') query: string) {
    return this.stocksService.search(query ?? '');
  }

  /** 热门股票榜单 - 返回成交量/涨幅排名靠前的股票 */
  @Get('hot')
  getHotStocks(@Query('limit') limit?: string) {
    return this.stocksService.getHotStocks(limit ? parseInt(limit) : 8);
  }

  /** 批量实时行情 - 支持任意股票代码 */
  @Get('quotes')
  async getQuotes(@Query('codes') codes: string) {
    if (!codes) {
      return this.stocksService.getBatchQuotes(['sh000001', 'sz399001', 'sz399006']);
    }
    const list = codes.split(',').map((c) => c.trim()).filter(Boolean);
    return this.stocksService.getBatchQuotes(list);
  }

  /**
   * 多周期K线（通用入口）
   * period: minute | 5day | day | week | month | season | year | 1min | 5min | 15min | 30min | 60min
   * count: 返回条数（默认120）
   */
  @Get(':code/kline')
  getKline(
    @Param('code') code: string,
    @Query('period') period: string,
    @Query('count') count?: string,
  ) {
    return this.stocksService.getStockKline(code, period ?? 'day', count ? parseInt(count) : 120);
  }

  /** 实时行情（经 API 层，不走前端直连第三方） */
  @Get(':code/quote')
  getRealtimeQuote(@Param('code') code: string) {
    return this.stocksService.getRealtimeQuote(code);
  }

  @Get(':code')
  getByCode(@Param('code') code: string) {
    return this.stocksService.getByCode(code);
  }

  @Get(':code/strategies')
  getStrategies(@Param('code') code: string) {
    return this.stocksService.getStrategies(code);
  }

  /** 日线历史数据（从本地数据库，兼容旧路由） */
  @Get(':code/daily')
  getDaily(@Param('code') code: string, @Query('days') days?: string) {
    return this.stocksService.getStockDaily(code, days ? parseInt(days) : 250);
  }
}

@Controller('stocks/user')
@UseGuards(JwtCookieAuthGuard)
export class UserStocksController {
  constructor(private readonly stocksService: StocksService) {}

  @Get()
  list(@Req() req: AuthedRequest) {
    return this.stocksService.listUserStocks(req.user.sub);
  }

  @Post()
  add(@Req() req: AuthedRequest, @Body() dto: AddUserStockDto) {
    return this.stocksService.addUserStock(req.user.sub, dto.stockCode);
  }

  @Delete(':stockCode')
  remove(@Req() req: AuthedRequest, @Param('stockCode') stockCode: string) {
    return this.stocksService.removeUserStock(req.user.sub, stockCode);
  }
}
