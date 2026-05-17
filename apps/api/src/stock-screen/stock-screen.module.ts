import { Module } from '@nestjs/common';
import { StockScreenController } from './stock-screen.controller';
import { StockScreenService } from './stock-screen.service';
import { StocksModule } from '../stocks/stocks.module';

@Module({
  imports: [StocksModule],
  controllers: [StockScreenController],
  providers: [StockScreenService],
  exports: [StockScreenService],
})
export class StockScreenModule {}
