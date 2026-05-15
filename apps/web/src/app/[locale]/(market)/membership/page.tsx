'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';

type Plan = {
  level: 'NORMAL' | 'PRIVATE';
  type: 'TRIAL' | 'MONTHLY';
  name: string;
  price: number;
  days: number;
  features: string[];
};

type Membership = {
  level: string;
  expiredAt: string | null;
};

export default function MembershipPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [myMembership, setMyMembership] = useState<Membership | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      apiFetch<Plan[]>('/membership/plans'),
      apiFetch<Membership | null>('/membership/me').catch(() => null),
    ])
      .then(([p, m]) => {
        setPlans(p);
        setMyMembership(m);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function purchase(plan: Plan) {
    setPurchasing(plan.type + '_' + plan.level);
    try {
      await apiFetch('/membership/purchase', {
        method: 'POST',
        body: JSON.stringify({ planType: plan.type, level: plan.level }),
      });
      alert('购买成功！');
      window.location.reload();
    } catch (e) {
      alert('购买失败：' + (e instanceof Error ? e.message : '未知错误'));
    } finally {
      setPurchasing(null);
    }
  }

  const isActive = myMembership?.expiredAt && new Date(myMembership.expiredAt) > new Date();

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold">会员中心</h1>
        <p className="text-sm text-slate-400 mt-1">解锁全部AI分析特权，领先一步</p>
      </div>

      {/* 当前状态 */}
      {myMembership && (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
          {isActive ? (
            <div className="flex items-center gap-3">
              <span className="text-2xl">👑</span>
              <div>
                <div className="font-medium text-white">{myMembership.level === 'PRIVATE' ? '私人会员' : '普通会员'}</div>
                <div className="text-xs text-slate-400">有效期至：{new Date(myMembership.expiredAt!).toLocaleDateString('zh-CN')}</div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <span className="text-2xl">🥀</span>
              <div>
                <div className="font-medium text-slate-400">暂未开通会员</div>
                <div className="text-xs text-slate-500">开通即享AI策略分析特权</div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 套餐 */}
      {loading ? (
        <div className="text-center text-slate-400 py-8">加载中...</div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {plans.map((plan) => (
            <div
              key={plan.type + '_' + plan.level}
              className={`bg-slate-800 border rounded-xl p-5 ${
                plan.level === 'PRIVATE' ? 'border-yellow-500/50' : 'border-slate-700'
              }`}
            >
              {plan.level === 'PRIVATE' && (
                <div className="text-xs text-yellow-400 mb-2">⭐ 推荐</div>
              )}
              <div className="font-bold text-lg mb-1">{plan.name}</div>
              <div className="text-sm text-slate-400 mb-3">有效期 {plan.days} 天</div>
              <div className="mb-4">
                <span className="text-3xl font-bold text-white">¥{plan.price}</span>
              </div>
              <ul className="space-y-1.5 mb-5">
                {plan.features.map((f) => (
                  <li key={f} className="text-sm text-slate-300 flex items-center gap-2">
                    <span className="text-green-400">✓</span> {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => purchase(plan)}
                disabled={purchasing !== null}
                className={`w-full py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  plan.level === 'PRIVATE'
                    ? 'bg-yellow-600 hover:bg-yellow-500 text-white'
                    : 'bg-blue-600 hover:bg-blue-500 text-white'
                } disabled:opacity-50`}
              >
                {purchasing === plan.type + '_' + plan.level ? '处理中...' : '立即开通'}
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="text-center text-xs text-slate-600">
        市场有风险，投资需谨慎。AI分析仅供参考，不构成投资建议。
      </div>
    </div>
  );
}
