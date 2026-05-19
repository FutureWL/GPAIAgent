import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Response } from 'express';
import bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import {
  ACCESS_TOKEN_COOKIE,
  ACCESS_TOKEN_EXPIRES_IN_SECONDS,
  REFRESH_TOKEN_COOKIE,
  REFRESH_TOKEN_EXPIRES_IN_SECONDS,
} from './auth.constants';
import { JwtPayload } from './jwt-payload';

type SafeUser = {
  id: string;
  username: string;
  name: string | null;
  avatar: string | null;
  email?: string | null;
  bio?: string | null;
  createdAt?: Date;
  membership?: {
    level: string;
    type: string;
    status: string;
    expiredAt: Date;
  } | null;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(params: { username: string; password: string }, res: Response): Promise<SafeUser> {
    const existing = await this.prismaService.user.findUnique({ where: { username: params.username } });
    if (existing) {
      throw new ConflictException('Username already exists');
    }

    const passwordHash = await bcrypt.hash(params.password, 10);
    const user = await this.prismaService.user.create({
      data: {
        username: params.username,
        passwordHash,
        name: params.username,
      },
    });

    await this.setAuthCookies(res, { id: user.id, username: user.username, role: user.role });

    return {
      id: user.id,
      username: user.username,
      name: user.name,
      avatar: user.avatar,
    };
  }

  async login(params: { username: string; password: string }, res: Response): Promise<SafeUser> {
    const user = await this.prismaService.user.findUnique({ where: { username: params.username } });
    if (!user) {
      throw new UnauthorizedException('Invalid username or password');
    }

    // 开发环境 bypass：devtest / devpass123
    if (process.env.NODE_ENV !== 'production' && params.username === 'devtest' && params.password === 'devpass123') {
      await this.setAuthCookies(res, { id: user.id, username: user.username, role: user.role });
      return { id: user.id, username: user.username, name: user.name, avatar: user.avatar };
    }

    const ok = await bcrypt.compare(params.password, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException('Invalid username or password');
    }

    await this.setAuthCookies(res, { id: user.id, username: user.username, role: user.role });

    return {
      id: user.id,
      username: user.username,
      name: user.name,
      avatar: user.avatar,
    };
  }

  async logout(res: Response): Promise<void> {
    res.clearCookie(ACCESS_TOKEN_COOKIE);
    res.clearCookie(REFRESH_TOKEN_COOKIE);
  }

  async me(userId: string): Promise<SafeUser> {
    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true, name: true, avatar: true },
    });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    return user;
  }

  async getFullProfile(userId: string): Promise<SafeUser> {
    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        name: true,
        avatar: true,
        email: true,
        bio: true,
        createdAt: true,
        membership: {
          select: {
            level: true,
            type: true,
            status: true,
            expiredAt: true,
          },
        },
      },
    });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    return user;
  }

  async updateProfile(userId: string, dto: { name?: string; bio?: string; avatar?: string; email?: string }): Promise<SafeUser> {
    const user = await this.prismaService.user.update({
      where: { id: userId },
      data: {
        name: dto.name ?? undefined,
        bio: dto.bio ?? undefined,
        avatar: dto.avatar ?? undefined,
        email: dto.email ?? undefined,
      },
      select: {
        id: true,
        username: true,
        name: true,
        avatar: true,
        email: true,
        bio: true,
        createdAt: true,
        membership: {
          select: {
            level: true,
            type: true,
            status: true,
            expiredAt: true,
          },
        },
      },
    });
    return user;
  }

  async getUserStats(userId: string) {
    const [postCount, commentCount, stockCount] = await Promise.all([
      this.prismaService.post.count({ where: { authorId: userId } }),
      this.prismaService.postComment.count({ where: { userId } }),
      this.prismaService.userStock.count({ where: { userId } }),
    ]);
    return { postCount, commentCount, stockCount };
  }

  async refresh(refreshToken: string, res: Response): Promise<void> {
    const refreshSecret = this.configService.get<string>('JWT_REFRESH_SECRET');
    if (!refreshSecret) throw new Error('JWT_REFRESH_SECRET is not configured');
    let payload: JwtPayload;
    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(refreshToken, { secret: refreshSecret });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = await this.prismaService.user.findUnique({ where: { id: payload.sub } });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    await this.setAuthCookies(res, { id: user.id, username: user.username, role: user.role });
  }

  private async setAuthCookies(res: Response, user: { id: string; username: string; role: string }): Promise<void> {
    const accessSecret = this.configService.get<string>('JWT_ACCESS_SECRET');
    if (!accessSecret) throw new Error('JWT_ACCESS_SECRET is not configured');
    const refreshSecret = this.configService.get<string>('JWT_REFRESH_SECRET');
    if (!refreshSecret) throw new Error('JWT_REFRESH_SECRET is not configured');
    const isProd = this.configService.get<string>('NODE_ENV') === 'production';

    const payload: JwtPayload = { sub: user.id, username: user.username, role: user.role };

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: accessSecret,
      expiresIn: ACCESS_TOKEN_EXPIRES_IN_SECONDS,
    });

    const refreshToken = await this.jwtService.signAsync(payload, {
      secret: refreshSecret,
      expiresIn: REFRESH_TOKEN_EXPIRES_IN_SECONDS,
    });

    res.cookie(ACCESS_TOKEN_COOKIE, accessToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      maxAge: ACCESS_TOKEN_EXPIRES_IN_SECONDS * 1000,
      path: '/',
    });

    res.cookie(REFRESH_TOKEN_COOKIE, refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      maxAge: REFRESH_TOKEN_EXPIRES_IN_SECONDS * 1000,
      path: '/',
    });
  }
}
