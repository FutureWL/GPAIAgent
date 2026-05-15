import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PostsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [posts, total] = await Promise.all([
      this.prisma.post.findMany({
        where: { status: 'published' },
        include: {
          author: { select: { id: true, username: true, name: true, avatar: true } },
          _count: { select: { likes: true, comments: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.post.count({ where: { status: 'published' } }),
    ]);

    return {
      posts: posts.map((p) => ({
        ...p,
        likeCount: p._count.likes,
        commentCount: p._count.comments,
        _count: undefined,
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string) {
    const post = await this.prisma.post.findUnique({
      where: { id },
      include: {
        author: { select: { id: true, username: true, name: true, avatar: true } },
        comments: {
          include: { user: { select: { id: true, username: true, avatar: true } } },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
        _count: { select: { likes: true, comments: true } },
      },
    });

    if (!post) throw new NotFoundException('Post not found');

    return {
      ...post,
      likeCount: post._count.likes,
      commentCount: post._count.comments,
      _count: undefined,
    };
  }

  async create(userId: string, data: { title: string; content: string; excerpt?: string; coverImage?: string; type?: string }) {
    const excerpt = data.excerpt || data.content.replace(/<[^>]+>/g, '').slice(0, 120);
    return this.prisma.post.create({
      data: {
        title: data.title,
        content: data.content,
        excerpt,
        coverImage: data.coverImage || null,
        type: data.type || 'article',
        authorId: userId,
      },
      include: {
        author: { select: { id: true, username: true, name: true, avatar: true } },
      },
    });
  }

  async toggleLike(userId: string, postId: string) {
    const existing = await this.prisma.postLike.findUnique({
      where: { userId_postId: { userId, postId } },
    });

    if (existing) {
      await this.prisma.postLike.delete({ where: { userId_postId: { userId, postId } } });
      await this.prisma.post.update({ where: { id: postId }, data: { likeCount: { decrement: 1 } } });
      return { liked: false };
    } else {
      await this.prisma.postLike.create({ data: { userId, postId } });
      await this.prisma.post.update({ where: { id: postId }, data: { likeCount: { increment: 1 } } });
      return { liked: true };
    }
  }

  async toggleBookmark(userId: string, postId: string) {
    const existing = await this.prisma.postBookmark.findUnique({
      where: { userId_postId: { userId, postId } },
    });

    if (existing) {
      await this.prisma.postBookmark.delete({ where: { userId_postId: { userId, postId } } });
      return { bookmarked: false };
    } else {
      await this.prisma.postBookmark.create({ data: { userId, postId } });
      return { bookmarked: true };
    }
  }

  async incrementView(postId: string) {
    await this.prisma.post.update({
      where: { id: postId },
      data: { viewCount: { increment: 1 } },
    });
    return { ok: true };
  }

  async getComments(postId: string, page = 1) {
    const skip = (page - 1) * 20;
    const [comments, total] = await Promise.all([
      this.prisma.postComment.findMany({
        where: { postId },
        include: { user: { select: { id: true, username: true, avatar: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: 20,
      }),
      this.prisma.postComment.count({ where: { postId } }),
    ]);
    return { comments, total, page };
  }

  async addComment(userId: string, postId: string, content: string) {
    const [comment] = await Promise.all([
      this.prisma.postComment.create({
        data: { userId, postId, content },
        include: { user: { select: { id: true, username: true, avatar: true } } },
      }),
      this.prisma.post.update({ where: { id: postId }, data: { commentCount: { increment: 1 } } }),
    ]);
    return comment;
  }

  async deleteComment(userId: string, postId: string, commentId: string) {
    const comment = await this.prisma.postComment.findUnique({ where: { id: commentId } });
    if (!comment) throw new NotFoundException('Comment not found');
    if (comment.userId !== userId) throw new ForbiddenException('Not your comment');

    await Promise.all([
      this.prisma.postComment.delete({ where: { id: commentId } }),
      this.prisma.post.update({ where: { id: postId }, data: { commentCount: { decrement: 1 } } }),
    ]);
  }

  async getMyDrafts(userId: string) {
    return this.prisma.post.findMany({
      where: { authorId: userId, status: 'draft' },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async getMyPosts(userId: string) {
    return this.prisma.post.findMany({
      where: { authorId: userId, status: 'published' },
      orderBy: { createdAt: 'desc' },
    });
  }

  async delete(userId: string, postId: string) {
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) throw new NotFoundException('Post not found');
    if (post.authorId !== userId) throw new ForbiddenException('Not your post');

    await this.prisma.post.delete({ where: { id: postId } });
  }
}
