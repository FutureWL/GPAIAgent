import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { StrategiesModule } from './strategies/strategies.module';
import { CommentsModule } from './comments/comments.module';
import { BacktestsModule } from './backtests/backtests.module';
import { StocksModule } from './stocks/stocks.module';
import { MembershipModule } from './membership/membership.module';
import { AiModule } from './ai/ai.module';
import { StockScreenModule } from './stock-screen/stock-screen.module';
import { PostsModule } from './posts/posts.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    PrismaModule,
    AuthModule,
    StrategiesModule,
    CommentsModule,
    BacktestsModule,
    StocksModule,
    MembershipModule,
    AiModule,
    StockScreenModule,
    PostsModule,
  ],
})
export class AppModule {}
