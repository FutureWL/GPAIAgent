'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch } from '../../lib/api';

type Plan = {
  level: 'NORMAL' | 'PRIVATE';
  type: 'TRIAL' | 'MONTHLY';
  name: string;
  price: number;
  days: number;
  features: string[];
};

type Me = { id: string; username: string; name: string | null };
type Membership = { level: string; type: string; status: string; expiredAt: string };

const PLAN_COLORS: Record<string, string> = {
  NORMAL: 'from-blue-600 to-blue-800',
  PRIVATE: 'from-amber-500 to-amber-800',
};

export default function MembershipPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [me, setMe] = useState<Me | null>(null);
  const [membership, setMembership] = useState<Membership | null>(null);
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    apiFetch<Plan[]>('/membership/plans')
      .then((data) => { if (!cancelled) setPlans(data); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });

    apiFetch<Me>('/auth/me')
      .then((data) => { if (!cancelled) setMe(data); })
      .catch(() => { if (!cancelled) setMe(null); });

    apiFetch<Membership>('/membership/me')
      .then((data) => { if (!cancelled) setMembership(data); })
      .catch(() => { if (!cancelled) setMembership(null); });

    return () => { cancelled = true; };
  }, []);

  async function activate(level: 'NORMAL' | 'PRIVATE', type: 'TRIAL' | 'MONTHLY') {
    if (!me) return;
    setActivating(`${level}-${type}`);
    try {
      await apiFetch('/membership/activate', {
        method: 'POST',
        body: JSON.stringify({ level, type }),
      });
      const data = await apiFetch<Membership>('/membership/me');
      setMembership(data);
      alert('激活成功！');
    } catch {
      alert('激活失败，请重试');
    } finally {
      setActivating(null);
    }
  }

  const isActive = membership?.status === 'ACTIVE' && new Date(membership.expiredAt) > new Date();

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 text-white">
      <header className="border-b border-slate-700">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-6">
          <Link href="/" className="text-xl font-bold">GPAIAgent</Link>
          <nav className="flex gap-4 text-sm text-slate-300">
            <Link href="/">首页</Link>
            <Link href="/watchlist">自选</Link>
            <Link href="/membership" className="text-white font-medium">会员</Link>
            <Link href="/strategies">策略广场</Link>
          </nav>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-8">
        {me && (
          <div className="mb-8 bg-slate-800/60 border border-slate-700 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-slate-300 mb-3">我的会员</h2>
            {isActive ? (
              <div className="flex items-center gap-4">
                <div className="text-2xl">{membership?.level === 'PRIVATE' ? '👑' : '⭐'}</div>
                <div>
                  <div className="font-semibold">{membership?.level === 'PRIVATE' ? '私人会员' : '普通会员'}</div>
                  <div className="text-xs text-slate-400 mt-1">
                    到期时间：{new Date(membership!.expiredAt).toLocaleDateString('zh-CN')}
                  </div>
                </div>
                <div className="ml-auto text-xs text-green-400 bg-green-400/10 border border-green-400/20 rounded px-2 py-1">已激活</div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="text-2xl">🔒</div>
                <div className="text-slate-400 text-sm">暂未开通会员</div>
              </div>
            )}
          </div>
        )}

        {!me && (
          <div className="mb-8 text-center py-6">
            <div className="text-slate-400 text-sm mb-3">登录后可购买会员</div>
            <div className="flex gap-3 justify-center">
              <Link href="/login" className="bg-white text-slate-900 rounded px-5 py-2 font-medium">登录</Link>
              <Link href="/register" className="border border-slate-500 rounded px-5 py-2">注册</Link>
            </div>
          </div>
        )}

        <h2 className="text-xl font-bold mb-4">会员套餐</h2>
        {loading ? (
          <div className="text-slate-400 text-sm">加载中...</div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {plans.map((plan) => {
              const isTrial = plan.type === 'TRIAL';
              return (
                <div key={`${plan.level}-${plan.type}`} className="bg-slate-800/60 border border-slate-700 rounded-xl overflow-hidden">
                  <div className={`bg-gradient-to-r ${PLAN_COLORS[plan.level]} p-4`}>
                    <div className="text-xs opacity-80">{isTrial ? '体验卡' : '月卡'}</div>
                    <div className="text-2xl font-bold mt-1">{plan.name}</div>
                    <div className="mt-2">
                      <span className="text-3xl font-bold">¥{plan.price}</span>
                      <span className="text-sm opacity-80 ml-1">/{plan.days}天</span>
                    </div>
                  </div>
                  <div className="p-4">
                    <ul className="space-y-2">
                      {plan.features.map((f, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                          <span className="text-green-400 mt-0.5">✓</span>
                          {f}
                        </li>
                      ))}
                    </ul>
                    <button
                      onClick={() => activate(plan.level, plan.type)}
                      disabled={!me || !!activating}
                      className="mt-4 w-full bg-white text-slate-900 rounded-lg py-2 text-sm font-semibold hover:bg-slate-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {activating === `${plan.level}-${plan.type}` ? '激活中...' : me ? '立即激活' : '登录后购买'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-10 grid grid-cols-2 gap-4">
          <div className="bg-blue-900/20 border border-blue-800/30 rounded-xl p-4">
            <div className="text-lg font-semibold mb-2">⭐ 普通会员</div>
            <ul className="space-y-1.5 text-sm text-slate-300">
              <li>✓ 认知提升服务</li>
              <li>✓ 实盘投研服务</li>
              <li>✓ 每日3次AI策略分析</li>
            </ul>
          </div>
          <div className="bg-amber-900/20 border border-amber-800/30 rounded-xl p-4">
            <div className="text-lg font-semibold mb-2">👑 私人会员</div>
            <ul className="space-y-1.5 text-sm text-slate-300">
              <li>✓ 全部普通会员权益</li>
              <li>✓ 一对一深度分析</li>
              <li>✓ 月度专属交流群</li>
              <li>✓ 不限次数AI策略分析</li>
            </ul>
          </div>
        </div>
      </div>
    </main>
  );
}
