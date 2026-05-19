# Admin 管理后台缺失接口修复计划

## Goal

修复 `/zh/admin` 各子页面数据为空的问题，补充后端缺失的 API 接口。

## 当前问题诊断

### 1. 后端已实现的接口（正常）
| 接口 | 调用方 | 状态 |
|------|--------|------|
| `GET /admin/stats` | dashboard page | ✅ 存在 |
| `GET /admin/users` | users page | ✅ 存在 |
| `PATCH /admin/users/:id/role` | users page | ✅ 存在 |
| `PATCH /admin/users/:id/disable` | users page | ✅ 存在 |
| `GET /admin/posts` | posts page | ✅ 存在 |
| `POST /admin/posts/:id/review` | posts page | ✅ 存在 |
| `GET /admin/strategies` | — | ✅ 存在 |
| `POST /admin/strategies/:id/review` | — | ✅ 存在 |
| `GET /admin/sync/queue` | — | ✅ 存在 |
| `GET /admin/sync/jobs` | — | ✅ 存在 |
| `POST /admin/sync/trigger` | — | ✅ 存在 |
| `GET /admin/audit-logs` | — | ✅ 存在 |

### 2. 前端调用但后端缺失的接口（数据为空根因）
| 接口 | 调用方 | 问题 |
|------|--------|------|
| `GET /admin/sync/status` | dashboard, stocks page | ❌ 缺失 |
| `GET /admin/stocks` | stocks page | ❌ 缺失 |
| `GET /admin/comments` | comments page | ❌ 缺失 |
| `DELETE /admin/comments/:id` | comments page | ❌ 缺失 |
| `GET /admin/ai-generations` | ai-generations page | ❌ 缺失 |

### 3. 前端类型与后端 Schema 不匹配
- **users page**: `User.id` 前端定义为 `number`，后端 Prisma 返回 `string`（cuid）
- **posts page**: `Post.author` 前端期望 `string`，后端返回 `{ id, username, name }` 对象
- **posts page**: `Post.id` 前端定义为 `number`，后端返回 `string`
- **comments page**: 接口参数名 `page`/`pageSize`（后端支持），但 URL 构建可能有问题

### 4. memberships 页面缺失
- `layout.tsx` 侧边栏有 `/admin/memberships` 导航项，但 `apps/web/src/app/[locale]/admin/memberships/page.tsx` 不存在

---

## 实施计划

### Step 1: 补充缺失的后端接口

#### 1.1 `GET /admin/sync/status`
简单聚合接口，返回 `{ queueDepth, recentJobs }`，Dashboard 和 Stocks 页面都用。

**文件**: `apps/api/src/admin/admin.controller.ts` + `admin.service.ts`

```typescript
// controller
@Get('sync/status')
async getSyncStatus() {
  return this.adminService.getSyncStatus();
}

// service
async getSyncStatus() {
  const [queueDepth, recentJobs] = await Promise.all([
    this.prismaService.syncQueue.count({ where: { status: 'PENDING' } }),
    this.prismaService.syncJob.count({
      where: { startedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
    }),
  ]);
  return { queueDepth, recentJobs };
}
```

#### 1.2 `GET /admin/stocks`
分页返回股票列表，需要关联最新行情快照时间。

**文件**: `apps/api/src/admin/admin.controller.ts` + `admin.service.ts`

```typescript
@Get('stocks')
async getStocks(
  @Query('page') page?: string,
  @Query('pageSize') pageSize?: string,
  @Query('search') search?: string,
) {
  return this.adminService.getStocks({
    page: page ? Number(page) : undefined,
    pageSize: pageSize ? Number(pageSize) : undefined,
    search,
  });
}
```

#### 1.3 `GET /admin/comments`
分页返回评论列表。

**文件**: `apps/api/src/admin/admin.controller.ts` + `admin.service.ts`

#### 1.4 `DELETE /admin/comments/:id`
删除评论接口。

**文件**: `apps/api/src/admin/admin.controller.ts` + `admin.service.ts`

#### 1.5 `GET /admin/ai-generations`
分页返回 AI 生成记录。

**文件**: `apps/api/src/admin/admin.controller.ts` + `admin.service.ts`

---

### Step 2: 修复前端类型不匹配

#### 2.1 `admin/users/page.tsx`
- `User.id` 类型从 `number` 改为 `string`
- 这也影响 `handleRoleChange(userId: number)` 和 `handleToggleDisable(userId: number, ...)` 的参数类型

#### 2.2 `admin/posts/page.tsx`
- `Post.id` 类型从 `number` 改为 `string`
- `Post.author` 类型从 `string` 改为 `{ id: string; username: string; name: string | null }`
- `handleReview` 参数 `postId: number` → `string`

#### 2.3 `admin/comments/page.tsx`
- `Comment.id` 类型从 `number` 改为 `string`
- `Comment.postId` 类型从 `number` 改为 `string`
- `Comment.author` 类型从 `string` 改为 `{ id: string; username: string; name: string | null }`
- `handleDelete(id: number)` → `handleDelete(id: string)`

#### 2.4 `admin/stocks/page.tsx`
- `Stock.id` 类型从 `number` 改为 `string`
- 响应数据适配：后端返回的 `lastSyncAt` 实际不存在，需改为用 `createdAt` 或通过 `StockQuote` 关联计算

#### 2.5 `admin/ai-generations/page.tsx`
- `AiGeneration.id` 类型从 `number` 改为 `string`
- `AiGeneration.userId` 类型从 `number` 改为 `string`

---

### Step 3: 创建缺失的 memberships 页面

**文件**: `apps/web/src/app/[locale]/admin/memberships/page.tsx`

布局参考现有的 cards 风格，实现：
- 会员列表（分页）
- 会员状态管理（启用/禁用）
- 到期时间显示

对应需要的后端接口（如果不存在）：
- `GET /admin/memberships`
- `PATCH /admin/memberships/:id`（如需管理功能）

---

### Step 4: 验证

1. 启动后端 API：`cd apps/api && pnpm dev`
2. 启动前端：`cd apps/web && pnpm dev`
3. 登录 admin 账号（`admin / admin123`）
4. 依次访问各子页面，确认数据正常显示

---

## 风险与注意事项

- **数据库空**：如果数据库本身没有种子数据，各表为空是正常的，需先 seed
- **ID 类型不一致**：Prisma cuid 是 string，前端很多地方写了 `number`，需统一改为 string
- **audit log**：评论删除等操作应写入审计日志
- **memberships 后端接口**：如果 schema 有 Membership 模型但后端没暴露接口，需要一并添加

---

## 文件变更清单

**后端（API）**:
- `apps/api/src/admin/admin.controller.ts` — 新增 5 个端点
- `apps/api/src/admin/admin.service.ts` — 新增 5 个 service 方法

**前端（Web）**:
- `apps/web/src/app/[locale]/admin/users/page.tsx` — 修复类型
- `apps/web/src/app/[locale]/admin/posts/page.tsx` — 修复类型
- `apps/web/src/app/[locale]/admin/comments/page.tsx` — 修复类型 + 接口适配
- `apps/web/src/app/[locale]/admin/stocks/page.tsx` — 修复类型 + 接口适配
- `apps/web/src/app/[locale]/admin/ai-generations/page.tsx` — 修复类型
- `apps/web/src/app/[locale]/admin/memberships/page.tsx` — 新建页面
