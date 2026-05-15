'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type Post = {
  id: string;
  title: string;
  excerpt: string;
  coverImage: string | null;
  type: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  createdAt: string;
  author: { username: string; name: string | null };
};

export default function BlogPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    fetch(`${API_URL}/posts`)
      .then((r) => r.json())
      .then((data) => {
        setPosts(data.posts || []);
        setLoading(false);
      })
      .catch(() => {
        setError('加载失败');
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400">
        <span>加载中...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 text-red-400">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold mb-1">博客文章</h1>
          <p className="text-sm text-slate-400">阅读最新资讯与教程</p>
        </div>
        <Link
          href="/blog/new"
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm transition-colors"
        >
          发布文章
        </Link>
      </div>

      {posts.length === 0 ? (
        <div className="flex items-center justify-center h-64 text-slate-400">
          暂无文章
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {posts.map((post) => (
            <Link
              key={post.id}
              href={`/blog/${post.id}`}
              className="block bg-slate-800 border border-slate-700 rounded-xl overflow-hidden hover:border-slate-600 transition-colors"
            >
              {post.coverImage && (
                <div className="aspect-video bg-slate-700 overflow-hidden">
                  <img src={post.coverImage} alt={post.title} className="w-full h-full object-cover" />
                </div>
              )}
              <div className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`px-2 py-0.5 rounded text-xs ${post.type === 'video' ? 'bg-purple-600 text-white' : 'bg-blue-600 text-white'}`}>
                    {post.type === 'video' ? '📹 视频' : '📄 文章'}
                  </span>
                </div>
                <h3 className="font-semibold mb-1 line-clamp-2">{post.title}</h3>
                {post.excerpt && (
                  <p className="text-sm text-slate-400 line-clamp-2 mb-3">{post.excerpt}</p>
                )}
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>{post.author.name || post.author.username}</span>
                  <span>{new Date(post.createdAt).toLocaleDateString('zh-CN')}</span>
                </div>
                <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
                  <span>👁 {post.viewCount}</span>
                  <span>❤️ {post.likeCount}</span>
                  <span>💬 {post.commentCount}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
