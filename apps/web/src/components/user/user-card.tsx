'use client';

import Link from 'next/link';
import { Avatar, Badge, Tag } from 'antd';

interface UserCardProps {
  user: {
    id: string;
    username: string;
    name?: string | null;
    avatar?: string | null;
    email?: string | null;
    bio?: string | null;
    createdAt?: string;
    membership?: {
      level: string;
      type: string;
      status: string;
      expiredAt: string;
    } | null;
  };
  stats?: {
    postCount: number;
    commentCount: number;
    stockCount: number;
  };
  locale?: string;
  /** 是否为紧凑模式（用于 Header 下拉） */
  compact?: boolean;
}

const MEMBERSHIP_COLORS: Record<string, string> = {
  NORMAL: 'gold',
  PRIVATE: 'purple',
};

const MEMBERSHIP_LABELS: Record<string, string> = {
  NORMAL: '普通会员',
  PRIVATE: '私人会员',
};

export default function UserCard({ user, stats, locale = 'zh', compact = false }: UserCardProps) {
  const displayName = user.name || user.username;
  const initials = displayName.slice(0, 1).toUpperCase();

  if (compact) {
    // 紧凑模式：Header 下拉里的小卡片
    return (
      <div className="flex items-center gap-3 px-3 py-2">
        <Avatar
          size={40}
          src={user.avatar}
          style={{ backgroundColor: '#1677ff', flexShrink: 0 }}
        >
          {initials}
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm truncate">{displayName}</span>
            {user.membership && user.membership.status === 'ACTIVE' && (
              <Tag color={MEMBERSHIP_COLORS[user.membership.level]} className="text-xs m-0">
                {MEMBERSHIP_LABELS[user.membership.level]}
              </Tag>
            )}
          </div>
          <div className="text-xs text-gray-400 truncate">@{user.username}</div>
        </div>
      </div>
    );
  }

  // 完整模式：Profile 页面用的大卡片
  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
      {/* 顶部背景 + 头像区 */}
      <div className="relative bg-gradient-to-r from-blue-600 to-indigo-600 px-6 pb-16 pt-8">
        <div className="flex items-end gap-4">
          <Badge
            offset={[-4, 4]}
            count={
              user.membership && user.membership.status === 'ACTIVE' ? (
                <Tag
                  color={MEMBERSHIP_COLORS[user.membership.level]}
                  className="text-xs border-0"
                  style={{ fontSize: 11, padding: '0 6px' }}
                >
                  {MEMBERSHIP_LABELS[user.membership.level]}
                </Tag>
              ) : null
            }
          >
            <Avatar
              size={80}
              src={user.avatar}
              style={{
                backgroundColor: 'rgba(255,255,255,0.2)',
                border: '3px solid white',
                fontSize: 32,
                lineHeight: '74px',
              }}
            >
              {initials}
            </Avatar>
          </Badge>
          <div className="flex-1 min-w-0 pb-1">
            <h2 className="text-xl font-bold text-white truncate">{displayName}</h2>
            <p className="text-blue-100 text-sm">@{user.username}</p>
          </div>
          <Link href={`/${locale}/settings`}>
            <button className="px-4 py-1.5 bg-white/20 hover:bg-white/30 text-white text-sm rounded-lg transition-colors border border-white/30">
              编辑资料
            </button>
          </Link>
        </div>
      </div>

      {/* 用户信息 */}
      <div className="px-6 -mt-8">
        {user.bio && (
          <p className="text-gray-600 text-sm mb-3 leading-relaxed">{user.bio}</p>
        )}
        <div className="flex flex-wrap gap-3 mb-4 text-sm text-gray-500">
          {user.email && (
            <span className="flex items-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
              {user.email}
            </span>
          )}
          {user.createdAt && (
            <span className="flex items-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              加入于 {new Date(user.createdAt).toLocaleDateString('zh-CN')}
            </span>
          )}
        </div>

        {/* 统计数据 */}
        {stats && (
          <div className="grid grid-cols-3 gap-4 py-4 border-t border-gray-100">
            <div className="text-center">
              <div className="text-xl font-bold text-gray-800">{stats.postCount}</div>
              <div className="text-xs text-gray-400 mt-0.5">发帖</div>
            </div>
            <div className="text-center border-x border-gray-100">
              <div className="text-xl font-bold text-gray-800">{stats.commentCount}</div>
              <div className="text-xs text-gray-400 mt-0.5">评论</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-gray-800">{stats.stockCount}</div>
              <div className="text-xs text-gray-400 mt-0.5">自选股</div>
            </div>
          </div>
        )}

        {/* 会员信息 */}
        {user.membership && (
          <div className="py-3 border-t border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">会员状态</span>
                <Tag color={user.membership.status === 'ACTIVE' ? 'green' : 'default'}>
                  {user.membership.status === 'ACTIVE' ? '有效' : '已过期'}
                </Tag>
              </div>
              <Link href={`/${locale}/membership`} className="text-xs text-blue-500 hover:text-blue-600">
                升级会员 →
              </Link>
            </div>
            {user.membership.status === 'ACTIVE' && (
              <p className="text-xs text-gray-400 mt-1">
                到期时间：{new Date(user.membership.expiredAt).toLocaleDateString('zh-CN')}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
