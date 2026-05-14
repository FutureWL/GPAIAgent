import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { BacktestsController } from './backtests.controller';
import { BacktestsService } from './backtests.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [BacktestsController],
  providers: [BacktestsService],
})
export class BacktestsModule {}
