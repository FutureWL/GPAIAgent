import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Request } from 'express';
import { JwtPayload } from './jwt-payload';

/**
 * Admin 权限守卫
 * 必须配合 JwtCookieAuthGuard 使用：
 *   @UseGuards(JwtCookieAuthGuard, AdminGuard)
 *
 * 校验 req.user.role === 'ADMIN'，否则返回 403
 */
@Injectable()
export class AdminGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const user = (req as Request & { user: JwtPayload }).user;

    if (!user || user.role !== 'ADMIN') {
      throw new ForbiddenException('Admin access required');
    }

    return true;
  }
}
