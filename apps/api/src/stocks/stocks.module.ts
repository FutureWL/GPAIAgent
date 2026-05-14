import { Module } from '@nestjs/common';
import { StocksService } from './stocks.service';
import { StocksController, UserStocksController } from './stocks.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  providers: [StocksService],
  controllers: [StocksController, UserStocksController],
  exports: [StocksService],
})
export class StocksModule {}
