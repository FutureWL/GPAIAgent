import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PostsService {
  constructor(private prisma: PrismaService) {}

  async findAll(page = 1, pageSize = 10) {
    const skip = (page - 1) * pageSize;
    const [posts, total] = await Promise.all([
      (this.prisma as any).post.findMany({
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          author: { select: { id: true, username: true, name: true, avatar: true } },
          _count: { select: { likes: true, comments: true } },
        },
      }),
      (this.prisma as any).post.count(),
    ]);
    return {
      posts: posts.map((p: any) => ({
        ...p,
        likeCount: p._count.likes,
        commentCount: p._count.comments,
        viewCount: p.viewCount ?? 0,
      })),
      total,
      page,
      pageSize,
    };
  }

  async findOne(id: string) {
    const post = await (this.prisma as any).post.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
      include: {
        author: { select: { id: true, username: true, name: true, avatar: true } },
        _count: { select: { likes: true, comments: true } },
      },
    });
    return {
      ...post,
      likeCount: post._count.likes,
      commentCount: post._count.comments,
      liked: false,
      bookmarked: false,
    };
  }

  async create(data: { title: string; content: string; excerpt?: string; coverImage?: string; type?: string }, authorId: string) {
    return (this.prisma as any).post.create({
      data: {
        title: data.title,
        content: data.content,
        excerpt: data.excerpt || data.content.slice(0, 120),
        coverImage: data.coverImage || null,
        type: data.type || 'article',
        authorId,
      },
    });
  }

  async toggleLike(postId: string, userId: string) {
    const existing = await (this.prisma as any).postLike.findUnique({
      where: { postId_userId: { postId, userId } },
    });
    if (existing) {
      await (this.prisma as any).postLike.delete({ where: { id: existing.id } });
      return { liked: false };
    }
    await (this.prisma as any).postLike.create({ data: { postId, userId } });
    return { liked: true };
  }

  async getComments(postId: string) {
    return (this.prisma as any).postComment.findMany({
      where: { postId },
      orderBy: { createdAt: 'asc' },
      include: {
        author: { select: { id: true, username: true, name: true, avatar: true } },
      },
    });
  }

  async addComment(postId: string, content: string, authorId: string) {
    return (this.prisma as any).postComment.create({
      data: { postId, content, authorId },
      include: {
        author: { select: { id: true, username: true, name: true, avatar: true } },
      },
    });
  }

  async toggleBookmark(postId: string, userId: string) {
    const existing = await (this.prisma as any).postBookmark.findUnique({
      where: { postId_userId: { postId, userId } },
    });
    if (existing) {
      await (this.prisma as any).postBookmark.delete({ where: { id: existing.id } });
      return { bookmarked: false };
    }
    await (this.prisma as any).postBookmark.create({ data: { postId, userId } });
    return { bookmarked: true };
  }
}
