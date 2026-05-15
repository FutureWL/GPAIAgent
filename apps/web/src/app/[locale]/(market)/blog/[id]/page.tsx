'use client';

import { use, useState, useEffect } from 'react';
import Link from 'next/link';

interface Author {
  id: string;
  username: string;
  name: string | null;
  avatar: string | null;
}

interface Comment {
  id: string;
  content: string;
  createdAt: string;
  user: Author;
}

interface Post {
  id: string;
  title: string;
  content: string;
  excerpt: string | null;
  coverImage: string | null;
  type: string;
  videoUrl: string | null;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  createdAt: string;
  author: Author;
  liked?: boolean;
}

export default function BlogDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [liking, setLiking] = useState(false);
  const [liked, setLiked] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  // 获取文章详情
  useEffect(() => {
    fetch(`${API_URL}/posts/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setPost(data);
        setLiked(data.liked || false);
        setLoading(false);
      });
  }, [id]);

  // 获取评论
  useEffect(() => {
    fetch(`${API_URL}/posts/${id}/comments`)
      .then((r) => r.json())
      .then((data) => {
        setComments(data.comments || []);
      });
  }, [id]);

  async function handleLike() {
    setLiking(true);
    try {
      const res = await fetch(`${API_URL}/posts/${id}/like`, {
        method: 'POST',
        credentials: 'include',
      });
      if (res.ok) {
        setLiked(!liked);
        setPost((p) =>
          p ? { ...p, likeCount: liked ? p.likeCount - 1 : p.likeCount + 1 } : null
        );
      }
    } finally {
      setLiking(false);
    }
  }

  async function handleComment(e: React.FormEvent) {
    e.preventDefault();
    if (!commentText.trim()) return;
    setSubmittingComment(true);
    try {
      const res = await fetch(`${API_URL}/posts/${id}/comments`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: commentText }),
      });
      if (res.ok) {
        const newComment = await res.json();
        setComments((prev) => [...prev, newComment]);
        setCommentText('');
        setPost((p) =>
          p ? { ...p, commentCount: p.commentCount + 1 } : null
        );
      }
    } finally {
      setSubmittingComment(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400">
        <span>加载中...</span>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400">
        <span>文章不存在</span>
      </div>
    );
  }

  const dateStr = post.createdAt
    ? new Date(post.createdAt).toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : '';

  return (
    <div className="max-w-4xl">
      {/* 返回链接 */}
      <Link href="/blog" className="text-sm text-blue-400 hover:text-blue-300 mb-4 inline-flex items-center gap-1">
        ← 返回博客
      </Link>

      {/* 文章主体 */}
      <article className="bg-slate-800 rounded-xl p-6 mb-6">
        {/* 标题 */}
        <h1 className="text-2xl font-bold mb-4">{post.title}</h1>

        {/* 作者信息 */}
        <div className="flex items-center gap-3 mb-4 pb-4 border-b border-slate-700">
          <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-lg">
            {(post.author.name || post.author.username)[0].toUpperCase()}
          </div>
          <div>
            <div className="font-medium">{post.author.name || post.author.username}</div>
            <div className="text-xs text-slate-400">{dateStr}</div>
          </div>
        </div>

        {/* 封面图 */}
        {post.coverImage && (
          <div className="mb-4 rounded-lg overflow-hidden">
            <img src={post.coverImage} alt={post.title} className="w-full max-h-96 object-cover" />
          </div>
        )}

        {/* 互动栏 */}
        <div className="flex items-center gap-6 mb-6 pb-4 border-b border-slate-700 text-sm text-slate-400">
          <span>👁 {post.viewCount}</span>
          <button
            onClick={handleLike}
            disabled={liking}
            className={`flex items-center gap-1 transition-colors ${liked ? 'text-red-400' : 'hover:text-red-400'}`}
          >
            {liked ? '❤️' : '🤍'} {post.likeCount}
          </button>
          <span>💬 {post.commentCount}</span>
          <button className="hover:text-blue-400 transition-colors">🔗 {post.shareCount}</button>
        </div>

        {/* 内容 */}
        <div
          className="prose prose-invert max-w-none"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />
      </article>

      {/* 评论区 */}
      <section className="bg-slate-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-4">评论 ({comments.length})</h2>

        {/* 评论表单 */}
        <form onSubmit={handleComment} className="mb-6">
          <textarea
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="写下你的评论..."
            rows={3}
            className="w-full bg-slate-700 border border-slate-600 rounded-lg p-3 text-sm resize-none focus:outline-none focus:border-blue-500"
          />
          <div className="flex justify-end mt-2">
            <button
              type="submit"
              disabled={submittingComment || !commentText.trim()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 rounded-lg text-sm transition-colors"
            >
              {submittingComment ? '发表中...' : '发表评论'}
            </button>
          </div>
        </form>

        {/* 评论列表 */}
        <div className="space-y-4">
          {comments.length === 0 ? (
            <div className="text-center text-slate-400 py-8">暂无评论</div>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-sm flex-shrink-0">
                  {(comment.user.name || comment.user.username)[0].toUpperCase()}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">{comment.user.name || comment.user.username}</span>
                    <span className="text-xs text-slate-400">
                      {new Date(comment.createdAt).toLocaleDateString('zh-CN')}
                    </span>
                  </div>
                  <p className="text-sm text-slate-300">{comment.content}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
