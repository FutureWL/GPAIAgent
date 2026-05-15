import {
  Controller,
  Get,
  Post as HttpPost,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtCookieAuthGuard } from '../auth/auth.guard';
import type { AuthedRequest } from '../auth/auth.guard';
import { PostsService } from './posts.service';

@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Get()
  findAll(@Query('page') page = 1, @Query('limit') limit = 20) {
    return this.postsService.findAll(+page, +limit);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.postsService.findOne(id);
  }

  @HttpPost()
  @UseGuards(JwtCookieAuthGuard)
  create(@Request() req: AuthedRequest, @Body() body: { title: string; content: string; excerpt?: string; coverImage?: string; type?: string }) {
    return this.postsService.create(req.user.sub, body);
  }

  @HttpPost(':id/like')
  @UseGuards(JwtCookieAuthGuard)
  @HttpCode(HttpStatus.OK)
  toggleLike(@Request() req: AuthedRequest, @Param('id') id: string) {
    return this.postsService.toggleLike(req.user.sub, id);
  }

  @HttpPost(':id/bookmark')
  @UseGuards(JwtCookieAuthGuard)
  @HttpCode(HttpStatus.OK)
  toggleBookmark(@Request() req: AuthedRequest, @Param('id') id: string) {
    return this.postsService.toggleBookmark(req.user.sub, id);
  }

  @HttpPost(':id/view')
  @HttpCode(HttpStatus.OK)
  incrementView(@Param('id') id: string) {
    return this.postsService.incrementView(id);
  }

  @Get(':id/comments')
  getComments(@Param('id') id: string, @Query('page') page = 1) {
    return this.postsService.getComments(id, +page);
  }

  @HttpPost(':id/comments')
  @UseGuards(JwtCookieAuthGuard)
  addComment(@Request() req: AuthedRequest, @Param('id') id: string, @Body() body: { content: string }) {
    return this.postsService.addComment(req.user.sub, id, body.content);
  }

  @Delete(':id/comments/:commentId')
  @UseGuards(JwtCookieAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteComment(@Request() req: AuthedRequest, @Param('id') id: string, @Param('commentId') commentId: string) {
    return this.postsService.deleteComment(req.user.sub, id, commentId);
  }

  @Get('my/drafts')
  @UseGuards(JwtCookieAuthGuard)
  getMyDrafts(@Request() req: AuthedRequest) {
    return this.postsService.getMyDrafts(req.user.sub);
  }

  @Get('my/posts')
  @UseGuards(JwtCookieAuthGuard)
  getMyPosts(@Request() req: AuthedRequest) {
    return this.postsService.getMyPosts(req.user.sub);
  }

  @Delete(':id')
  @UseGuards(JwtCookieAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(@Request() req: AuthedRequest, @Param('id') id: string) {
    return this.postsService.delete(req.user.sub, id);
  }
}
