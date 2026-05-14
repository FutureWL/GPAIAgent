import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type MembershipPlan = {
  level: 'NORMAL' | 'PRIVATE';
  type: 'TRIAL' | 'MONTHLY';
  name: string;
  price: number;
  days: number;
  features: string[];
};

const PLANS: MembershipPlan[] = [
  { level: 'NORMAL', type: 'TRIAL', name: '普通会员-体验卡', price: 199, days: 7, features: ['认知提升服务', '实盘投研服务'] },
  { level: 'NORMAL', type: 'MONTHLY', name: '普通会员-月卡', price: 1999, days: 30, features: ['认知提升服务', '实盘投研服务'] },
  { level: 'PRIVATE', type: 'TRIAL', name: '私人会员-体验卡', price: 399, days: 7, features: ['全部权益', '一对一深度分析', '月度专属交流群'] },
  { level: 'PRIVATE', type: 'MONTHLY', name: '私人会员-月卡', price: 3999, days: 30, features: ['全部权益', '一对一深度分析', '月度专属交流群'] },
];

@Injectable()
export class MembershipService {
  constructor(private readonly prismaService: PrismaService) {}

  getPlans(): MembershipPlan[] { return PLANS; }

  async getMyMembership(userId: string) {
    const m = await this.prismaService.membership.findUnique({ where: { userId } });
    if (!m) return { hasMembership: false };
    const plan = PLANS.find((p) => p.level === m.level && p.type === m.type);
    return { hasMembership: true, ...m, plan };
  }

  async activate(userId: string, level: 'NORMAL' | 'PRIVATE', type: 'TRIAL' | 'MONTHLY') {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + (type === 'TRIAL' ? 7 : 30));
    const m = await this.prismaService.membership.upsert({
      where: { userId },
      create: { userId, level, type, status: 'ACTIVE', expiresAt },
      update: { level, type, status: 'ACTIVE', expiresAt },
    });
    return m;
  }

  async checkAccess(userId: string, requiredLevel: 'NORMAL' | 'PRIVATE' = 'NORMAL') {
    const m = await this.prismaService.membership.findUnique({ where: { userId } });
    if (!m || m.status !== 'ACTIVE' || m.expiresAt < new Date()) return false;
    if (requiredLevel === 'PRIVATE' && m.level !== 'PRIVATE') return false;
    return true;
  }
}
