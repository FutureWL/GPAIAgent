import { Controller, Get, Post, Body, UseGuards, Request } from '@nestjs/common';
import { MembershipService } from './membership.service';
import { JwtAuthGuard } from '../auth/auth.guard';

@Controller('membership')
export class MembershipController {
  constructor(private readonly membershipService: MembershipService) {}

  @Get('plans')
  getPlans() {
    return this.membershipService.getPlans();
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getMyMembership(@Request() req: { user: { id: string } }) {
    return this.membershipService.getMyMembership(req.user.id);
  }

  @Post('activate')
  @UseGuards(JwtAuthGuard)
  activate(
    @Request() req: { user: { id: string } },
    @Body() body: { level: 'NORMAL' | 'PRIVATE'; type: 'TRIAL' | 'MONTHLY' },
  ) {
    return this.membershipService.activate(req.user.id, body.level, body.type);
  }
}
