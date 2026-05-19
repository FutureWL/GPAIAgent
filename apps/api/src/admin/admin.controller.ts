import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtCookieAuthGuard, AuthedRequest } from '../auth/auth.guard';
import { AdminGuard } from '../auth/admin.guard';
import { AdminService } from './admin.service';
import { Request } from 'express';

type AdminRequest = AuthedRequest;

@Controller('admin')
@UseGuards(JwtCookieAuthGuard, AdminGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  private getClientIp(req: Request): string {
    return (req.headers['x-forwarded-for'] as string) || req.ip || '';
  }

  // ============ 平台统计 ============

  @Get('stats')
  async getStats() {
    return this.adminService.getStats();
  }

  // ============ 用户管理 ============

  @Get('users')
  async getUsers(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('search') search?: string,
  ) {
    return this.adminService.getUsers({
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
      search,
    });
  }

  @Get('users/:id')
  async getUser(@Param('id') id: string) {
    return this.adminService.getUser(id);
  }

  @Patch('users/:id/role')
  async updateUserRole(
    @Param('id') id: string,
    @Body() body: { role: string },
    @Req() req: AdminRequest,
    @Req() rawReq: Request,
  ) {
    return this.adminService.updateUserRole({
      adminId: req.user.sub,
      targetUserId: id,
      role: body.role,
      ip: this.getClientIp(rawReq),
    });
  }

  @Post('users/:id/disable')
  async toggleUserDisabled(
    @Param('id') id: string,
    @Body() body: { disabled: boolean },
    @Req() req: AdminRequest,
    @Req() rawReq: Request,
  ) {
    return this.adminService.toggleUserDisabled({
      adminId: req.user.sub,
      targetUserId: id,
      disabled: body.disabled,
      ip: this.getClientIp(rawReq),
    });
  }

  // ============ 内容审核 ============

  @Get('posts')
  async getPosts(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.adminService.getPosts({
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
      status,
      search,
    });
  }

  @Post('posts/:id/review')
  async reviewPost(
    @Param('id') id: string,
    @Body() body: { action: 'approve' | 'reject' | 'remove'; reason?: string },
    @Req() req: AdminRequest,
    @Req() rawReq: Request,
  ) {
    return this.adminService.reviewPost({
      adminId: req.user.sub,
      postId: id,
      action: body.action,
      reason: body.reason,
      ip: this.getClientIp(rawReq),
    });
  }

  @Get('strategies')
  async getStrategies(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.adminService.getStrategies({
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
      status,
      search,
    });
  }

  @Post('strategies/:id/review')
  async reviewStrategy(
    @Param('id') id: string,
    @Body() body: { action: 'approve' | 'reject' | 'remove'; reason?: string },
    @Req() req: AdminRequest,
    @Req() rawReq: Request,
  ) {
    return this.adminService.reviewStrategy({
      adminId: req.user.sub,
      strategyId: id,
      action: body.action,
      reason: body.reason,
      ip: this.getClientIp(rawReq),
    });
  }

  // ============ 同步管理 ============

  @Get('sync/queue')
  async getSyncQueue(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('status') status?: string,
  ) {
    return this.adminService.getSyncQueue({
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
      status,
    });
  }

  @Get('sync/jobs')
  async getSyncJobs(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.adminService.getSyncJobs({
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
  }

  @Post('sync/trigger')
  async triggerSync(@Req() req: AdminRequest, @Req() rawReq: Request) {
    return this.adminService.triggerSync({
      adminId: req.user.sub,
      ip: this.getClientIp(rawReq),
    });
  }

  // ============ 操作日志 ============

  @Get('audit-logs')
  async getAuditLogs(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('action') action?: string,
    @Query('targetType') targetType?: string,
  ) {
    return this.adminService.getAuditLogs({
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
      action,
      targetType,
    });
  }
}
