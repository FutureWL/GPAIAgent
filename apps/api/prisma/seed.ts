/**
 * GPAIAgent 数据库 Seed 脚本
 * 用途：首次初始化 / 数据被清除后快速恢复
 * 安全：可重复运行，不会重复创建数据
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 开始 seed 数据...');

  // 1. 确保至少有 1 个测试用户
  const existingUser = await prisma.user.findFirst({ where: { username: 'devtest' } });
  if (!existingUser) {
    await prisma.user.create({
      data: {
        username: 'devtest',
        passwordHash: '$2b$10$dummy_hash_for_dev_only', // 占位，登录不用这个
        name: '测试用户',
      },
    });
    console.log('  ✅ 创建用户 devtest');
  } else {
    console.log('  ✓ 用户 devtest 已存在，跳过');
  }

  const user = await prisma.user.findFirst({ where: { username: 'devtest' } });
  if (!user) {
    console.log('❌ 无法获取用户，seed 中止');
    return;
  }

  // 1b. 确保有 admin 用户
  const existingAdmin = await prisma.user.findFirst({ where: { username: 'admin' } });
  if (!existingAdmin) {
    await prisma.user.create({
      data: {
        username: 'admin',
        passwordHash: '$2b$10$K8Q.8aGZ8V8Q.8aGZ8V8QO', // 占位，生产环境请修改密码
        name: '管理员',
        role: 'ADMIN',
      },
    });
    console.log('  ✅ 创建管理员用户 admin');
  } else {
    console.log('  ✓ 管理员用户 admin 已存在，跳过');
  }

  // 2. Seed 博文（如果还没有的话）
  const existingPosts = await prisma.post.count();
  if (existingPosts === 0) {
    const posts = [
      {
        title: '【深度】2026年A股上半年行情回顾与下半年展望',
        excerpt: '2026年上半年A股市场经历了显著的震荡调整。沪指从年初的3400点附近一度下探至2800点，随后在政策利好刺激下企稳回升。展望下半年，市场将呈现结构性机会。',
        content: '<p>2026年上半年，A股市场经历了显著的震荡调整。沪指从年初的3400点附近一度下探至2800点，随后在政策利好刺激下企稳回升。</p><p>展望下半年，我们认为市场将呈现结构性机会。消费升级、科技创新、新能源等领域值得重点关注。</p>',
        type: 'article',
        status: 'published',
        viewCount: 3847,
        likeCount: 156,
        commentCount: 23,
        shareCount: 45,
      },
      {
        title: '短线交易必胜技巧：量价配合实战解析',
        excerpt: '量价配合是短线交易的核心。当一只股票出现放量上涨时，往往意味着主力资金进场。',
        content: '<p>短线交易的核心在于量价配合。当一只股票出现放量上涨时，往往意味着主力资金进场。</p><p>本文通过多个实战案例，详细讲解如何识别真正的放量突破，以及如何设置止损位。</p>',
        type: 'article',
        status: 'published',
        viewCount: 5621,
        likeCount: 234,
        commentCount: 67,
        shareCount: 89,
      },
      {
        title: '【视频】如何用GPAIAgent构建自己的交易策略',
        excerpt: '视频教程：GPAIAgent平台使用指南',
        content: '<p>本期视频教程详细介绍如何使用GPAIAgent平台构建、回测并优化您的交易策略。从策略编写到历史回测，全程实战演示。</p>',
        type: 'video',
        status: 'published',
        viewCount: 2103,
        likeCount: 98,
        commentCount: 15,
        shareCount: 34,
      },
      {
        title: '芯片板块迎来周期拐点，这些标的值得关注',
        excerpt: '芯片板块周期拐点分析：经过近两年的调整，芯片板块估值已回落到历史低位。',
        content: '<p>经过近两年的调整，芯片板块的估值已经回落到历史低位。随着AI算力需求的爆发，芯片行业有望迎来新一轮周期。</p><p>本文分析了几只值得关注的芯片龙头标的。</p>',
        type: 'article',
        status: 'published',
        viewCount: 4521,
        likeCount: 189,
        commentCount: 45,
        shareCount: 67,
      },
      {
        title: '缠论入门：如何用缠论判断股价走势',
        excerpt: '缠论入门教程：缠论是本土最完整的技术分析体系之一。',
        content: '<p>缠论是本土最完整的技术分析体系之一，其核心思想是通过几何学的方法来研究股价走势。</p><p>本教程从基础概念入手，帮助初学者建立缠论思维框架。</p>',
        type: 'article',
        status: 'published',
        viewCount: 7834,
        likeCount: 312,
        commentCount: 89,
        shareCount: 112,
      },
    ];

    for (const post of posts) {
      await prisma.post.create({ data: { ...post, authorId: user.id } });
    }
    console.log(`  ✅ 创建了 ${posts.length} 篇博文`);
  } else {
    console.log(`  ✓ 已有 ${existingPosts} 篇博文，跳过`);
  }

  console.log('✅ Seed 完成！');
}

main()
  .catch((e) => {
    console.error('❌ Seed 失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
