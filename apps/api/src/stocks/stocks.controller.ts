import { Controller, Get, Post, Delete, Param, Query, Body, UseGuards, Req } from '@nestjs/common';
import { StocksService } from './stocks.service';
import { JwtCookieAuthGuard, AuthedRequest } from '../auth/auth.guard';

@Controller('stocks')
export class StocksController {
  constructor(private readonly stocksService: StocksService) {}

  @Get('search')
  search(@Query('q') query: string) {
    return this.stocksService.search(query ?? '');
  }

  @Get(':code')
  getByCode(@Param('code') code: string) {
    return this.stocksService.getByCode(code);
  }

  @Get(':code/strategies')
  getStrategies(@Param('code') code: string) {
    return this.stocksService.getStrategies(code);
  }
}

@Controller('user/stocks')
@UseGuards(JwtCookieAuthGuard)
export class UserStocksController {
  constructor(private readonly stocksService: StocksService) {}

  @Get()
  list(@Req() req: AuthedRequest) {
    return this.stocksService.listUserStocks(req.user.sub);
  }

  @Post()
  add(@Req() req: AuthedRequest, @Body() body: { stockCode: string }) {
    return this.stocksService.addUserStock(req.user.sub, body.stockCode);
  }

  @Delete(':stockCode')
  remove(@Req() req: AuthedRequest, @Param('stockCode') stockCode: string) {
    return this.stocksService.removeUserStock(req.user.sub, stockCode);
  }
}
