import { Controller, Get, Query } from '@nestjs/common';
import { AiSignalsService } from './ai-signals.service';

@Controller('ai-signals')
export class AiSignalsController {
  constructor(private readonly aiSignalsService: AiSignalsService) {}

  @Get('today')
  getTodaySignals(@Query('limit') limit?: string) {
    return this.aiSignalsService.getTodaySignals(limit ? parseInt(limit) : 3);
  }
}
