import { Module } from '@nestjs/common';
import { StocksService } from './stocks.service';
import { StocksController, UserStocksController } from './stocks.controller';

@Module({
  providers: [StocksService],
  controllers: [StocksController, UserStocksController],
  exports: [StocksService],
})
export class StocksModule {}
