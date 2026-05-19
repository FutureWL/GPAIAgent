import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { JwtCookieAuthGuard, OptionalJwtCookieAuthGuard } from './auth.guard';
import { AdminGuard } from './admin.guard';
import { AuthService } from './auth.service';
import { PrismaModule } from '../prisma/prisma.module';

@Global()
@Module({
  imports: [
    PrismaModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_ACCESS_SECRET'),
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtCookieAuthGuard, OptionalJwtCookieAuthGuard, AdminGuard],
  exports: [JwtModule, JwtCookieAuthGuard, OptionalJwtCookieAuthGuard, AdminGuard],
})
export class AuthModule {}
