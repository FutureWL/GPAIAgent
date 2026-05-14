import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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
  {
    level: 'NORMAL',
    type: 'TRIAL',
    name: '普通会员-体验卡',
    price: 199,
    days: 7,
    features: ['认知提升服务', '实盘投研服务'],
  },
  {
    level: 'NORMAL',
    type: 'MONTHLY',
    name: '普通会员-月卡',
    price: 1999,
    days: 30,
    features: ['认知提升服务', '实盘投研服务'],
  },
  {
    level: 'PRIVATE',
    type: 'TRIAL',
    name: '私人会员-体验卡',
    price: 399,
    days: 7,
    features: ['全部权益', '一对一深度分析', '月度专属交流群'],
  },
  {
    level: 'PRIVATE',
    type: 'MONTHLY',
    name: '私人会员-月卡',
    price: 3999,
    days: 30,
    features: ['全部权益', '一对一深度分析', '月度专属交流群'],
  },
];

@Injectable()
export class MembershipService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  getPlans(): MembershipPlan[] {
    return PLANS;
  }

  async getMyMembership(userId: string) {
    const membership = await this.prismaService.membership.findUnique({
      where: { userId },
    });

    if (!membership) {
      return { active: false, plan: null };
    }

    const now = new Date();
    const isActive = membership.status === 'ACTIVE' && membership.expiredAt > now;

    const plan = PLANS.find(
      (p) => p.level === membership.level && p.type === membership.type,
    );

    return {
      active: isActive,
      status: isActive ? 'ACTIVE' : 'EXPIRED',
      level: membership.level,
      type: membership.type,
      startedAt: membership.startedAt,
      expiredAt: membership.expiredAt,
      plan,
    };
  }

  async activate(userId: string, level: 'NORMAL' | 'PRIVATE', type: 'TRIAL' | 'MONTHLY') {
    const plan = PLANS.find((p) => p.level === level && p.type === type);
    if (!plan) {
      throw new Error('无效的会员套餐');
    }

    const now = new Date();
    const expiredAt = new Date(now.getTime() + plan.days * 24 * 60 * 60 * 1000);

    const membership = await this.prismaService.membership.upsert({
      where: { userId },
      create: {
        userId,
        level,
        type,
        expiredAt,
        status: 'ACTIVE',
      },
      update: {
        level,
        type,
        startedAt: now,
        expiredAt,
        status: 'ACTIVE',
      },
    });

    return {
      success: true,
      level: membership.level,
      type: membership.type,
      startedAt: membership.startedAt,
      expiredAt: membership.expiredAt,
    };
  }

  async checkAccess(userId: string): Promise<{ hasAccess: boolean; level: string | null }> {
    const membership = await this.prismaService.membership.findUnique({
      where: { userId },
    });

    if (!membership) {
      return { hasAccess: false, level: null };
    }

    const now = new Date();
    if (membership.status !== 'ACTIVE' || membership.expiredAt <= now) {
      return { hasAccess: false, level: null };
    }

    return { hasAccess: true, level: membership.level };
  }
}
