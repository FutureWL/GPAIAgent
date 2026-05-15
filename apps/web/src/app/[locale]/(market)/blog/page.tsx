import Link from 'next/link';
import { formatDistanceToNow } from '@/lib/utils';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getLocale } from 'next-intl/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

async function getPosts() {
  try {
    const res = await fetch(`${API_URL}/posts?page=1&pageSize=20`, { cache: 'no-store' });
    if (!res.ok) return { posts: [], total: 0 };
    return await res.json();
  } catch {
    return { posts: [], total: 0 };
  }
}

const TYPE_LABELS: Record<string, { zh: string; en: string }> = {
  article: { zh: '文章', en: 'Article' },
  video: { zh: '视频', en: 'Video' },
  tutorial: { zh: '教程', en: 'Tutorial' },
};

export default async function BlogPage() {
  const locale = await getLocale();
  const { posts, total } = await getPosts();

  return (
    <div className="max-w-4xl mx-auto">
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold">
          {locale === 'zh' ? '博客' : 'Blog'}
        </h1>
        <p className="text-muted-foreground mt-1">
          {locale === 'zh' ? `共 ${total} 篇内容` : `${total} posts`}
        </p>
      </div>

      {/* Posts grid */}
      <div className="grid gap-4">
        {posts.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              {locale === 'zh' ? '暂无内容' : 'No posts yet'}
            </CardContent>
          </Card>
        ) : (
          posts.map((post: any) => {
            const typeLabel = TYPE_LABELS[post.type]?.[locale === 'zh' ? 'zh' : 'en'] || post.type;
            const timeAgo = (() => {
              try {
                return formatDistanceToNow(new Date(post.createdAt), { locale: locale });
              } catch {
                return '';
              }
            })();
            return (
              <Card key={post.id} className="hover:bg-accent/5 transition-colors">
                <Link href={`/${locale}/blog/${post.id}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="secondary">{typeLabel}</Badge>
                        </div>
                        <h2 className="text-lg font-semibold leading-tight line-clamp-2">
                          {post.title}
                        </h2>
                      </div>
                      {post.coverImage && (
                        <img
                          src={post.coverImage}
                          alt={post.title}
                          className="w-24 h-16 object-cover rounded-md flex-shrink-0"
                        />
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="pb-3">
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {post.excerpt || post.content?.replace(/<[^>]+>/g, '').slice(0, 120)}
                    </p>
                  </CardContent>
                  <CardFooter className="text-xs text-muted-foreground gap-4">
                    <span>{post.author?.username || '未知作者'}</span>
                    <span>·</span>
                    <span>{timeAgo}</span>
                    <span>·</span>
                    <span>{post.viewCount || 0} 阅读</span>
                    <span>·</span>
                    <span>{post.likeCount || 0} 赞</span>
                  </CardFooter>
                </Link>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
