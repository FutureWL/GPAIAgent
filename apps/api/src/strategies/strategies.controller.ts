import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtCookieAuthGuard, AuthedRequest } from '../auth/auth.guard';
import { CreateStrategyDto } from './dto/create-strategy.dto';
import { StrategiesService } from './strategies.service';

@Controller('strategies')
export class StrategiesController {
  constructor(private readonly strategiesService: StrategiesService) {}

  @Get()
  async list(@Query('take') take?: string, @Query('skip') skip?: string) {
    return this.strategiesService.list({
      take: take ? Number(take) : undefined,
      skip: skip ? Number(skip) : undefined,
    });
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    return this.strategiesService.getById(id);
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
