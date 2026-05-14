import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { JwtCookieAuthGuard, AuthedRequest } from '../auth/auth.guard';
import { CreateCommentDto } from './dto/create-comment.dto';
import { CommentsService } from './comments.service';

@Controller('strategies/:strategyId/comments')
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Get()
  async list(@Param('strategyId') strategyId: string) {
    return this.commentsService.list(strategyId);
  }

  @UseGuards(JwtCookieAuthGuard)
  @Post()
  async create(@Param('strategyId') strategyId: string, @Req() req: AuthedRequest, @Body() dto: CreateCommentDto) {
    return this.commentsService.create({
      strategyId,
      authorId: req.user.sub,
      content: dto.content,
    });
  }
}
