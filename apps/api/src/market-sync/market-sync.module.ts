import { Module } from '@nestjs/common';
import { MarketSyncService } from './market-sync.service';
import { MarketSyncScheduler } from './market-sync.scheduler';
import { MarketService } from './market.service';
import { MarketController } from './market.controller';
import { StocksModule } from '../stocks/stocks.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [StocksModule, PrismaModule],
  controllers: [MarketController],
  providers: [MarketSyncService, MarketSyncScheduler, MarketService],
  exports: [MarketSyncService, MarketService],
})
export class MarketSyncModule {}
