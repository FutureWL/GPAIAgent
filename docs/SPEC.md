# GPAIAgent 需求规格说明书

> 文档版本：v0.1
> 更新日期：2026-05-14
> 负责人：魏来

---

## 一、产品定位

**一句话定位：** 短线炒股辅助平台，以 AI 为工具，辅助投资者提升认知与交易水平。

**核心价值主张：** 不帮你赚钱，帮你提升水平和认知，少走弯路。

**产品形态：** Web 应用（网站），先行跑通核心业务，后续再考虑微信小程序。

---

## 二、业务模型

### 2.1 核心实体

```
User（用户）
  ├── username / password（本地账号）
  ├── email（可选）
  ├── name（昵称）
  └── avatar（头像）

Stock（股票基础信息）
  ├── code（代码，如 600519）
  ├── name（名称，如 贵州茅台）
  ├── market（市场：sh / sz / bj）
  └── type（股票/债券/基金等）

UserStock（用户自选股）
  ├── userId → User
  ├── stockId → Stock
  └── addedAt

Membership（会员记录）
  ├── userId → User
  ├── level（普通会员 / 私人会员）
  ├── type（体验卡 / 月卡）
  ├── startedAt
  ├── expiredAt
  └── status（active / expired）

Strategy（策略）
  ├── title / description / content（正文 Markdown）
  ├── tags（标签数组）
  ├── stockCode（关联股票代码，可选）
  ├── riskLevel（风险等级标签，见下方）
  ├── viewCount / likeCount
  └── authorId → User

AIGeneration（AI 生成记录）
  ├── userId → User
  ├── stockCode（分析的股票）
  ├── prompt（用户 prompt）
  ├── result（AI 返回内容）
  ├── model（使用的模型）
  └── createdAt
```

### 2.2 风险等级标签（合规核心）

所有策略和股票分析，只给以下四种结论之一：

| 标签 | 含义 |
|------|------|
| `risk_high` | 风险大于收益 |
| `profit_high` | 收益大于风险 |
| `neutral` | 可买可不买（中性） |
| `avoid` | 不建议关注 |

### 2.3 会员体系

| 会员类型 | 价格 | 有效期 | 权益 |
|----------|------|--------|------|
| 普通会员-体验卡 | ¥199 | 7天 | 认知提升服务 + 实盘投研 |
| 普通会员-月卡 | ¥1999/月 | 30天 | 认知提升服务 + 实盘投研 |
| 私人会员-体验卡 | ¥399 | 7天 | 全部权益 + 一对一深度分析 + 专属群 |
| 私人会员-月卡 | ¥3999/月 | 30天 | 全部权益 + 一对一深度分析 + 专属群 |

**三大服务板块：**
1. 认知提升服务（知识、思维、技术）
2. 实盘投研服务（选股选时分析，仅供参考不构成买卖建议）
3. 私人定制服务（一对一深度交流、专属群）

---

## 三、功能模块

### 3.1 首页（行情汇总）

**功能：** 展示市场概览数据，供用户快速了解当日市场状况。

**展示内容（初期模拟数据，后续接入真实数据源）：**
- 上证指数：当前点位、涨跌幅、成交量
- 深证成指：当前点位、涨跌幅、成交量
- 创业板：当前点位、涨跌幅
- 今日强势板块（top 5）
- 今日弱势板块（top 5）
- 涨停/跌停数量

**说明：** 初期使用模拟数据，不需要真实行情接口。

### 3.2 自选股

**功能：** 用户添加关注的股票，快速查看行情。

**操作：**
- 搜索股票（按代码或名称模糊搜索）
- 添加到自选 / 从自选移除
- 列表展示：股票代码、名称、当前价、涨跌幅
- 点击进入股票详情页

**权限：** 登录用户可用。

### 3.3 策略广场

**功能：** 用户发布、浏览、互动投资策略内容。

**列表页：**
- 按时间倒序展示
- 显示：标题、描述、关联股票、风险标签、作者、浏览数、点赞数
- 支持按标签筛选

**详情页：**
- 策略正文（Markdown 渲染）
- 关联股票信息 + 风险标签
- AI 分析入口（付费会员专用）
- 点赞 / 评论
- 回测记录（作者可添加）

**发布页：**
- 标题 / 描述 / 正文（Markdown）
- 关联股票（搜索选择，可选）
- 风险标签（选择一项）
- 标签（多个自定义标签）

### 3.4 股票详情

**功能：** 查看单只股票的详细信息和 AI 分析。

**内容：**
- 股票基本信息（代码、名称、市场）
- 模拟行情数据（价、涨跌幅、成交量）
- AI 分析入口（付费会员）
- 相关策略列表（关联此股票的策略）

### 3.5 会员权益

**功能：** 展示会员体系，引导付费。

**页面内容：**
- 会员类型对比表
- 价格展示
- 核心权益说明
- 购买按钮（体验卡 / 月卡）

**说明：** 支付流程初期先做展示层，真实支付后续集成。

### 3.6 AI 分析

**功能：** 基于 MiniMax 大模型生成股票分析。

**分析维度：**
- 风险/收益研判
- 市场环境分析
- 形态技术面简评
- 综合结论（上述四种标签之一）

**输入：** 股票代码 + 用户 prompt
**输出：** AI 分析报告 + 风险标签

**权限：** 付费会员可用（体验卡和月卡均可用）。

---

## 四、技术方案

### 4.1 技术栈

| 层次 | 技术 | 说明 |
|------|------|------|
| 前端 | Next.js 15 + Tailwind CSS v4 | App Router |
| 后端 | NestJS + Prisma | REST API |
| 数据库 | PostgreSQL | localhost:5432 |
| AI | MiniMax API | 通过 HTTP 调用 |
| 进程管理 | PM2 | 开发/生产双环境 |
| 部署 | Git Hook | dev/main 分支触发 |

### 4.2 数据库环境

| 环境 | 数据库名 | 端口 |
|------|---------|------|
| 开发 | `gpaiagent_dev` | 5432 |
| 生产 | `gpaiagent_prod` | 5432 |

### 4.3 服务端口

| 服务 | 端口 |
|------|------|
| 开发环境 API | 3001 |
| 开发环境 Web | 3000 |
| 生产环境 API | 3002 |
| 生产环境 Web | 3003 |

### 4.4 目录结构

```
apps/
  api/               # NestJS 后端
    src/
      auth/          # 认证模块
      strategies/    # 策略模块
      stocks/        # 股票模块
      membership/    # 会员模块
      ai/            # AI 分析模块
      prisma/        # Prisma 服务
  web/               # Next.js 前端
    src/
      app/
        page.tsx              # 首页
        login/page.tsx        # 登录
        register/page.tsx     # 注册
        strategies/           # 策略相关页面
        stocks/               # 股票相关页面
        membership/           # 会员页面
```

### 4.5 MiniMax API 集成

- 使用 MiniMax 的 chat completions 接口
- API Key 配置在环境变量 `MINIMAX_API_KEY`
- Base URL：`https://api.minimax.chat/v1`
- 模型：`MiniMax-Text-01`

---

## 五、API 设计

### 5.1 Stocks 模块

```
GET  /stocks/search?q=关键词     # 搜索股票
GET  /stocks/:code               # 股票详情
GET  /stocks/:code/strategies    # 相关策略
```

### 5.2 UserStocks 模块（需登录）

```
GET    /user/stocks              # 我的自选股列表
POST   /user/stocks              # 添加自选 { stockCode }
DELETE /user/stocks/:stockCode  # 移除自选
```

### 5.3 Membership 模块

```
GET  /membership/me             # 我的会员状态
GET  /membership/plans          # 会员套餐列表
POST /membership/activate       # 激活会员（模拟）{ level, type }
```

### 5.4 AI 模块

```
POST /ai/analyze                 # AI 分析股票 { stockCode, prompt }
GET  /ai/history                # 我的 AI 分析历史（需登录）
```

### 5.5 Strategies 模块（扩展）

```
POST /strategies                 # 创建策略（扩展：新增 stockCode, riskLevel, tags 字段）
GET  /strategies?stockCode=xxx  # 按股票筛选策略
GET  /strategies?riskLevel=xxx  # 按风险标签筛选
```

---

## 六、合规原则（预留）

产品功能的所有表述必须符合监管要求：

- ❌ 不能说"买/卖某只股票"
- ❌ 不能预测涨跌
- ✅ 只说"风险大于收益/收益大于风险/可买可不买/不建议关注"
- ✅ 所有分析仅作为参考，不构成投资建议

---

## 七、待接入（暂缓）

- 真实行情数据源（Tushare / AKShare / 聚合数据）
- 微信支付 / 支付宝（真实支付）
- 微信公众号 + 私域运营
- 微信小程序
