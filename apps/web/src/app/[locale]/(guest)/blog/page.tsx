import Link from 'next/link';
import { formatDistanceToNow } from '@/lib/utils';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getLocale } from 'next-intl/server';

const API_URL = 'http://localhost:3001';

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

const TYPE_GRADIENTS: Record<string, string> = {
  article: 'from-blue-500/20 to-indigo-500/20',
  video: 'from-red-500/20 to-orange-500/20',
  tutorial: 'from-green-500/20 to-emerald-500/20',
};

export default async function BlogPage() {
  const locale = await getLocale();
  const isZh = locale === 'zh';
  const { posts, total } = await getPosts();

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">

      {/* Hero */}
      <div className="mb-10 space-y-3">
        <h1 className="text-3xl font-bold tracking-tight">
          {isZh ? '博客' : 'Blog'}
        </h1>
        <p className="text-muted-foreground">
          {isZh
            ? `共 ${total} 篇深度内容，涵盖选股策略、技术分析与市场洞察`
            : `${total} articles on stock strategies, technical analysis and market insights`}
        </p>
      </div>

      {/* Posts grid */}
      {posts.length === 0 ? (
        <Card className="py-16 text-center">
          <CardContent className="text-muted-foreground">
            {isZh ? '暂无内容，敬请期待' : 'No posts yet. Stay tuned.'}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {posts.map((post: any) => {
            const typeLabel = TYPE_LABELS[post.type]?.[isZh ? 'zh' : 'en'] || post.type;
            const gradient = TYPE_GRADIENTS[post.type] || 'from-muted/50 to-muted/30';
            const timeAgo = (() => {
              try {
                return formatDistanceToNow(new Date(post.createdAt), { locale });
              } catch { return ''; }
            })();

            return (
              <Link key={post.id} href={`/${locale}/blog/${post.id}`}>
                <Card className="h-full hover:shadow-md hover:border-primary/30 transition-all duration-200 group">
                  {/* Cover image or gradient placeholder */}
                  {post.coverImage ? (
                    <div className="aspect-video overflow-hidden rounded-t-lg">
                      <img
                        src={post.coverImage}
                        alt={post.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  ) : (
                    <div className={`h-32 bg-gradient-to-br ${gradient} rounded-t-lg flex items-center justify-center`}>
                      <span className="text-4xl opacity-30">📊</span>
                    </div>
                  )}

                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="secondary" className="text-xs">{typeLabel}</Badge>
                    </div>
                    <h2 className="text-base font-semibold leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                      {post.title}
                    </h2>
                  </CardHeader>

                  <CardContent className="pb-3">
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {post.excerpt || post.content?.replace(/<[^>]+>/g, '').slice(0, 100)}
                    </p>
                  </CardContent>

                  <CardFooter className="text-xs text-muted-foreground gap-3 pt-0">
                    <span className="font-medium truncate">{post.author?.username || (isZh ? '匿名' : 'Anonymous')}</span>
                    <span>·</span>
                    <span>{timeAgo}</span>
                    <span>·</span>
                    <span>{post.viewCount || 0} {isZh ? '阅读' : 'views'}</span>
                  </CardFooter>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
