import { Module } from '@nestjs/common';
import { AiSignalsService } from './ai-signals.service';
import { AiSignalsController } from './ai-signals.controller';

@Module({
  providers: [AiSignalsService],
  controllers: [AiSignalsController],
  exports: [AiSignalsService],
})
export class AiSignalsModule {}
