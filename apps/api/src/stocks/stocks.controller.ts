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

  /** 批量实时行情 - 支持任意股票代码 */
  @Get('quotes')
  async getQuotes(@Query('codes') codes: string) {
    if (!codes) {
      // 默认返回主要指数
      return this.stocksService.getBatchQuotes(['sh000001', 'sz399001', 'sz399006']);
    }
    const list = codes.split(',').map((c) => c.trim()).filter(Boolean);
    return this.stocksService.getBatchQuotes(list);
  }

  @Get(':code')
  getByCode(@Param('code') code: string) {
    return this.stocksService.getByCode(code);
  }

  @Get(':code/strategies')
  getStrategies(@Param('code') code: string) {
    return this.stocksService.getStrategies(code);
  }

  /** 日线历史数据（从本地数据库） */
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
