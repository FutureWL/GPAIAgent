import { Body, Controller, Get, Patch, Post, Req, Res, UnauthorizedException, UseGuards } from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { JwtCookieAuthGuard, AuthedRequest } from './auth.guard';
import { REFRESH_TOKEN_COOKIE } from './auth.constants';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) res: Response) {
    return this.authService.register(dto, res);
  }

  @Post('login')
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    return this.authService.login(dto, res);
  }

  @Post('logout')
  async logout(@Res({ passthrough: true }) res: Response) {
    await this.authService.logout(res);
    return { ok: true };
  }

  @UseGuards(JwtCookieAuthGuard)
  @Get('me')
  async me(@Req() req: AuthedRequest) {
    return this.authService.getFullProfile(req.user.sub);
  }

  @UseGuards(JwtCookieAuthGuard)
  @Patch('me')
  async updateProfile(
    @Req() req: AuthedRequest,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.authService.updateProfile(req.user.sub, dto);
  }

  @UseGuards(JwtCookieAuthGuard)
  @Get('stats')
  async getStats(@Req() req: AuthedRequest) {
    return this.authService.getUserStats(req.user.sub);
  }

  @Post('refresh')
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshToken = req.cookies?.[REFRESH_TOKEN_COOKIE];
    if (!refreshToken) {
      throw new UnauthorizedException('Missing refresh token');
    }
    await this.authService.refresh(refreshToken, res);
    return { ok: true };
  }
}
