import { Controller, Post, Get, Body, UseGuards, Request } from '@nestjs/common';
import { AiService } from './ai.service';
import { JwtAuthGuard } from '../auth/auth.guard';

@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('analyze')
  @UseGuards(JwtAuthGuard)
  analyze(
    @Request() req: { user: { id: string } },
    @Body() body: { stockCode: string; stockName: string; prompt: string },
  ) {
    return this.aiService.analyze(
      req.user.id,
      body.stockCode,
      body.stockName,
      body.prompt,
    );
  }

  @Get('history')
  @UseGuards(JwtAuthGuard)
  getHistory(@Request() req: { user: { id: string } }) {
    return this.aiService.getHistory(req.user.id);
  }
}
