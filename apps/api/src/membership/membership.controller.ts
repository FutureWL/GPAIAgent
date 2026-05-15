import { Controller, Get, Post, Body, UseGuards, Request } from '@nestjs/common';
import { MembershipService } from './membership.service';
import { JwtCookieAuthGuard } from '../auth/auth.guard';
import type { AuthedRequest } from '../auth/auth.guard';
import { ActivateMembershipDto } from './dto/activate-membership.dto';

@Controller('membership')
export class MembershipController {
  constructor(private readonly membershipService: MembershipService) {}

  @Get('plans')
  getPlans() { return this.membershipService.getPlans(); }

  @Get('me')
  @UseGuards(JwtCookieAuthGuard)
  getMyMembership(@Request() req: AuthedRequest) {
    return this.membershipService.getMyMembership(req.user.sub);
  }

  @Post('activate')
  @UseGuards(JwtCookieAuthGuard)
  activate(@Request() req: AuthedRequest, @Body() dto: ActivateMembershipDto) {
    return this.membershipService.activate(req.user.sub, dto.level, dto.type);
  }
}
