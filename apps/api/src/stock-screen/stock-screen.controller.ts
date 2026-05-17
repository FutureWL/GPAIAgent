import { Controller, Get, Post, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { StockScreenService } from './stock-screen.service';
import { JwtCookieAuthGuard, AuthedRequest } from '../auth/auth.guard';
import { CreateScreenDto } from './dto/create-screen.dto';
import { AiScreenDto } from './dto/ai-screen.dto';

@Controller('stock-screen')
export class StockScreenController {
  constructor(private readonly stockScreenService: StockScreenService) {}

  /** 条件选股（免费用户可用） */
  @Post('screen')
  screen(@Body() dto: CreateScreenDto) {
    return this.stockScreenService.screenStocks(dto.criteria);
  }

  /** AI 智能选股（需登录+会员） */
  @Post('ai')
  @UseGuards(JwtCookieAuthGuard)
  aiScreen(@Request() req: AuthedRequest, @Body() dto: AiScreenDto) {
    return this.stockScreenService.aiScreen(req.user.sub, dto.description);
  }

  /** 保存选股结果（需登录） */
  @Post('save')
  @UseGuards(JwtCookieAuthGuard)
  saveScreen(@Request() req: AuthedRequest, @Body() dto: CreateScreenDto) {
    return this.stockScreenService
      .screenStocks(dto.criteria)
      .then((results) =>
        this.stockScreenService.saveScreen(req.user.sub, dto, results),
      );
  }

  /** 选股历史（需登录） */
  @Get('history')
  @UseGuards(JwtCookieAuthGuard)
  getHistory(@Request() req: AuthedRequest, @Query('take') take?: string) {
    return this.stockScreenService.getHistory(
      req.user.sub,
      take ? parseInt(take) : 20,
    );
  }

  /** 选股详情（需登录） */
  @Get(':id')
  @UseGuards(JwtCookieAuthGuard)
  getById(@Request() req: AuthedRequest, @Param('id') id: string) {
    return this.stockScreenService.getById(req.user.sub, id);
  }
}
