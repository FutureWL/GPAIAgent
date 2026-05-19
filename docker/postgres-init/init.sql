-- GPAIAgent Docker 开发环境数据库初始化
-- 首次启动 postgres 容器时自动执行
-- 包含：schema（通过 prisma migrate） + 基础数据 seed

-- ============================================================
-- 基础用户
-- ============================================================
INSERT INTO "User" (id, "passwordHash", username, name, "createdAt", "updatedAt")
VALUES (
  'dev_user_cuid_001',
  '$2b$10$dummy_hash_for_dev_only',
  'devtest',
  '测试用户',
  NOW(),
  NOW()
) ON CONFLICT (username) DO NOTHING;

-- ============================================================
-- 博客文章
-- ============================================================
INSERT INTO "Post" (id, title, excerpt, content, type, status, "viewCount", "likeCount", "commentCount", "shareCount", "authorId", "createdAt", "updatedAt")
VALUES
  ('post_001', '【深度】2026年A股上半年行情回顾与下半年展望',
   '2026年上半年A股市场经历了显著的震荡调整。沪指从年初的3400点附近一度下探至2800点，随后在政策利好刺激下企稳回升。展望下半年，市场将呈现结构性机会。',
   '<p>2026年上半年，A股市场经历了显著的震荡调整。沪指从年初的3400点附近一度下探至2800点，随后在政策利好刺激下企稳回升。</p><p>展望下半年，我们认为市场将呈现结构性机会。消费升级、科技创新、新能源等领域值得重点关注。</p>',
   'article', 'published', 3847, 156, 23, 45, 'dev_user_cuid_001', NOW(), NOW()),

  ('post_002', '短线交易必胜技巧：量价配合实战解析',
   '量价配合是短线交易的核心。当一只股票出现放量上涨时，往往意味着主力资金进场。',
   '<p>短线交易的核心在于量价配合。当一只股票出现放量上涨时，往往意味着主力资金进场。</p><p>本文通过多个实战案例，详细讲解如何识别真正的放量突破，以及如何设置止损位。</p>',
   'article', 'published', 5621, 234, 67, 89, 'dev_user_cuid_001', NOW(), NOW()),

  ('post_003', '【视频】如何用GPAIAgent构建自己的交易策略',
   '视频教程：GPAIAgent平台使用指南',
   '<p>本期视频教程详细介绍如何使用GPAIAgent平台构建、回测并优化您的交易策略。从策略编写到历史回测，全程实战演示。</p>',
   'video', 'published', 2103, 98, 15, 34, 'dev_user_cuid_001', NOW(), NOW()),

  ('post_004', '芯片板块迎来周期拐点，这些标的值得关注',
   '芯片板块周期拐点分析：经过近两年的调整，芯片板块估值已回落到历史低位。',
   '<p>经过近两年的调整，芯片板块的估值已经回落到历史低位。随着AI算力需求的爆发，芯片行业有望迎来新一轮周期。</p><p>本文分析了几只值得关注的芯片龙头标的。</p>',
   'article', 'published', 4521, 189, 45, 67, 'dev_user_cuid_001', NOW(), NOW()),

  ('post_005', '缠论入门：如何用缠论判断股价走势',
   '缠论入门教程：缠论是本土最完整的技术分析体系之一。',
   '<p>缠论是本土最完整的技术分析体系之一，其核心思想是通过几何学的方法来研究股价走势。</p><p>本教程从基础概念入手，帮助初学者建立缠论思维框架。</p>',
   'article', 'published', 7834, 312, 89, 112, 'dev_user_cuid_001', NOW(), NOW())
ON CONFLICT DO NOTHING;

-- ============================================================
-- 会员（体验卡）
-- ============================================================
INSERT INTO "Membership" (id, "userId", level, type, "startedAt", "expiredAt", status)
VALUES (
  'membership_001',
  'dev_user_cuid_001',
  'PRIVATE',
  'TRIAL',
  NOW(),
  NOW() + INTERVAL '7 days',
  'ACTIVE'
) ON CONFLICT ("userId") DO NOTHING;
