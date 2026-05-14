import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { JwtCookieAuthGuard, AuthedRequest } from '../auth/auth.guard';
import { CreateBacktestDto } from './dto/create-backtest.dto';
import { BacktestsService } from './backtests.service';

@Controller('strategies/:strategyId/backtests')
export class BacktestsController {
  constructor(private readonly backtestsService: BacktestsService) {}

  @Get()
  async list(@Param('strategyId') strategyId: string) {
    return this.backtestsService.list(strategyId);
  }

  @UseGuards(JwtCookieAuthGuard)
  @Post()
  async create(
    @Param('strategyId') strategyId: string,
    @Req() req: AuthedRequest,
    @Body() dto: CreateBacktestDto,
  ) {
    return this.backtestsService.create({
      strategyId,
      authorId: req.user.sub,
      name: dto.name,
      params: dto.params,
      summary: dto.summary,
    });
  }
}
