import { Body, Controller, Delete, Get, Param, Post, Query, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
import { JwtCookieAuthGuard, OptionalJwtCookieAuthGuard, AuthedRequest } from '../auth/auth.guard';
import { CreateStrategyDto } from './dto/create-strategy.dto';
import { StrategiesService } from './strategies.service';

@Controller('strategies')
export class StrategiesController {
  constructor(private readonly strategiesService: StrategiesService) {}

  @Get()
  async list(
    @Query('take') take?: string,
    @Query('skip') skip?: string,
    @Query('stockCode') stockCode?: string,
    @Query('riskLevel') riskLevel?: string,
  ) {
    return this.strategiesService.list({
      take: take ? Number(take) : undefined,
      skip: skip ? Number(skip) : undefined,
      stockCode,
      riskLevel,
    });
  }

  @UseGuards(OptionalJwtCookieAuthGuard)
  @Get(':id')
  async get(@Param('id') id: string, @Req() req: AuthedRequest) {
    return this.strategiesService.getById(id, req.user?.sub);
  }

  @UseGuards(OptionalJwtCookieAuthGuard)
  @Post(':id/like')
  async like(@Param('id') id: string, @Req() req: AuthedRequest) {
    if (!req.user) {
      throw new UnauthorizedException('Please log in first');
    }
    return this.strategiesService.like(id, req.user.sub);
  }

  @UseGuards(JwtCookieAuthGuard)
  @Delete(':id/like')
  async unlike(@Param('id') id: string, @Req() req: AuthedRequest) {
    return this.strategiesService.unlike(id, req.user.sub);
  }

  @Post(':id/view')
  async view(@Param('id') id: string) {
    return this.strategiesService.incrementViewCount(id);
  }

  @UseGuards(JwtCookieAuthGuard)
  @Post()
  async create(@Req() req: AuthedRequest, @Body() dto: CreateStrategyDto) {
    return this.strategiesService.create({
      ...dto,
      authorId: req.user.sub,
    });
  }
}
