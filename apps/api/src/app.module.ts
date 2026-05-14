import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { StrategiesModule } from './strategies/strategies.module';
import { CommentsModule } from './comments/comments.module';
import { BacktestsModule } from './backtests/backtests.module';

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
  ],
})
export class AppModule {}
