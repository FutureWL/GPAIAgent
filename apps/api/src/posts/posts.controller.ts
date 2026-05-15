import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { PostsService } from './posts.service';
import { JwtCookieAuthGuard } from '../auth/auth.guard';
import { Request } from 'express';

@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Get()
  async findAll(
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '10',
  ) {
    return this.postsService.findAll(+page, +pageSize);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.postsService.findOne(id);
  }

  @Post()
  @UseGuards(JwtCookieAuthGuard)
  async create(@Body() body: { title: string; content: string; excerpt?: string; coverImage?: string; type?: string }, @Req() req: Request) {
    const userId = (req as any).user?.userId;
    return this.postsService.create(body, userId);
  }

  @Post(':id/like')
  @UseGuards(JwtCookieAuthGuard)
  async like(@Param('id') id: string, @Req() req: Request) {
    const userId = (req as any).user?.userId;
    return this.postsService.toggleLike(id, userId);
  }

  @Delete(':id/like')
  @UseGuards(JwtCookieAuthGuard)
  async unlike(@Param('id') id: string, @Req() req: Request) {
    const userId = (req as any).user?.userId;
    return this.postsService.toggleLike(id, userId);
  }

  @Get(':id/comments')
  async getComments(@Param('id') id: string) {
    return this.postsService.getComments(id);
  }

  @Post(':id/comments')
  @UseGuards(JwtCookieAuthGuard)
  async addComment(
    @Param('id') id: string,
    @Body() body: { content: string },
    @Req() req: Request,
  ) {
    const userId = (req as any).user?.userId;
    return this.postsService.addComment(id, body.content, userId);
  }

  @Post(':id/bookmark')
  @UseGuards(JwtCookieAuthGuard)
  async bookmark(@Param('id') id: string, @Req() req: Request) {
    const userId = (req as any).user?.userId;
    return this.postsService.toggleBookmark(id, userId);
  }

  @Delete(':id/bookmark')
  @UseGuards(JwtCookieAuthGuard)
  async unbookmark(@Param('id') id: string, @Req() req: Request) {
    const userId = (req as any).user?.userId;
    return this.postsService.toggleBookmark(id, userId);
  }
}
