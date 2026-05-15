import { Controller, Post, Get, Body, UseGuards, Request } from '@nestjs/common';
import { AiService } from './ai.service';
import { JwtCookieAuthGuard } from '../auth/auth.guard';
import type { AuthedRequest } from '../auth/auth.guard';

@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('analyze')
  @UseGuards(JwtCookieAuthGuard)
  analyze(@Request() req: AuthedRequest, @Body() body: { stockCode: string; stockName: string; prompt: string }) {
    return this.aiService.analyze(req.user.sub, body.stockCode, body.stockName, body.prompt);
  }

  @Get('history')
  @UseGuards(JwtCookieAuthGuard)
  getHistory(@Request() req: AuthedRequest) {
    return this.aiService.getHistory(req.user.sub);
  }
}
