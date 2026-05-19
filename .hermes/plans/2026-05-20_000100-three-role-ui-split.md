# 三角色界面拆分计划：游客 / 用户 / 管理员

**日期**: 2026-05-19
**目标**: 将平台拆分为三套独立 UI Shell，实现角色完全分离

---

## 一、现状分析

### 当前路由结构
```
app/[locale]/
├── layout.tsx          ← 统一 AppShell（所有角色共用）
├── (auth)/              ← 登录/注册（无 AppShell）
├── (market)/            ← 用户功能区
│   ├── home/            ← 首页（已登录用户）
│   ├── market/         ← 行情
│   ├── blog/            ← 博客
│   ├── watchlist/       ← 自选股
│   ├── stock-screen/   ← 选股工具
│   ├── strategies/     ← 策略广场
│   └── membership/      ← 会员中心
├── admin/               ← 管理员独立 layout
├── profile/
└── settings/
```

### 核心问题
- `(market)/` 内所有页面共用同一个 `[locale]/layout.tsx`（AppShell），未区分游客/用户
- 游客访问 `/market`、`/blog` 等页面时同样看到带 Sidebar 的登录态 UI
- `page.tsx`（根重定向）根据 `getMe()` 判断跳转，但布局本身已渲染了完整 AppShell
- 三种角色 UI 混合在同一套 layout 层级中，无法独立扩展

---

## 二、设计方案

### 三套独立 Shell

| 角色 | Shell 组件 | 特征 |
|------|-----------|------|
| **游客** | `GuestShell` | 简洁顶栏 + 公开导航，无侧边栏，无用户信息 |
| **用户** | `AppShell`（现有） | 完整侧边栏，交易功能，用户菜单 |
| **管理员** | `AdminLayout`（现有） | 侧边栏 admin 导航，独立配色 |

### 路由归属

```
[locale]/
├── layout.tsx              ← 无 Shell，仅 Provider + NextIntlClientProvider
│
├── (guest)/                ← 游客专属路由组
│   ├── layout.tsx          ← GuestShell（顶栏 + 公开导航）
│   ├── page.tsx            ← 首页/落地页（无需登录）
│   ├── market/             ← 公开行情（无需登录）
│   ├── blog/               ← 博客列表（无需登录）
│   └── stock/[code]/       ← 个股行情公开页（无需登录）
│
├── (auth)/                 ← 认证路由组（无 Shell）
│   ├── login/
│   └── register/
│
├── (user)/                 ← 已登录用户路由组
│   ├── layout.tsx          ← AppShell（侧边栏 + 顶栏）
│   ├── home/
│   ├── watchlist/
│   ├── stock-screen/
│   ├── strategies/
│   └── membership/
│
├── admin/                  ← 管理员路由组
│   └── layout.tsx          ← AdminLayout（已有）
│
├── profile/                ← 个人中心（AppShell 内）
└── settings/               ← 设置页（AppShell 内）
```

**关键规则**：
- `(guest)/` 的页面在 `layout.tsx` 中**不需要** `getMe()` 判断，任何人可访问
- `(user)/` 的页面在 `layout.tsx` 中**强制**检查 `getMe()`，未登录则跳转 `/login`
- `(auth)/` 的页面检测到已登录则跳转 `/home`

---

## 三、实施步骤

### Phase 0：创建 GuestShell 组件

**新建** `src/components/layout/guest-shell.tsx`

```
- 顶栏：Logo + 导航链接（首页/行情/博客）+ 登录/注册按钮
- 无侧边栏
- 支持语言切换
- 简洁 Footer
- 主题跟随系统
```

**样式方向**：与现有 shadcn/ui 体系一致，dark mode 适配

### Phase 1：将 `(market)` 拆分为 `(guest)` 和 `(user)`

**移动/新建文件**：

| 原路径 | 新路径 | 说明 |
|--------|--------|------|
| `(market)/home/` | `(user)/home/` | 用户首页，需登录 |
| `(market)/market/` | `(guest)/market/` | 公开行情，游客可看 |
| `(market)/blog/` | `(guest)/blog/` | 公开博客，游客可看 |
| `(market)/stock/[code]/` | `(guest)/stock/[code]/` | 个股公开页，游客可看 |
| `(market)/watchlist/` | `(user)/watchlist/` | 自选股，需登录 |
| `(market)/stock-screen/` | `(user)/stock-screen/` | 选股工具，需登录 |
| `(market)/strategies/` | `(user)/strategies/` | 策略广场，需登录 |
| `(market)/membership/` | `(user)/membership/` | 会员中心，需登录 |
| `(market)/home/HomeContent.tsx` | `(user)/home/HomeContent.tsx` | 随迁 |

**注意**：`[locale]/(market)/market/page.tsx` 路由组名从 `market` 改为 `(guest)`，`market` 作为目录名保留。

### Phase 2：创建 `(guest)/layout.tsx`

**新建** `src/app/[locale]/(guest)/layout.tsx`
```tsx
export default function GuestLayout({ children }) {
  return (
    <GuestShell>
      {children}
    </GuestShell>
  );
}
```

### Phase 3：创建 `(user)/layout.tsx`

**新建** `src/app/[locale]/(user)/layout.tsx`

- 引入现有 `AppShell`（来自 `components/layout/appshell.tsx`）
- 调用 `getMe()`，未登录则 `redirect('/login')`
- 将 `(user)/home/` 等页面移入此组

### Phase 4：清理 `[locale]/layout.tsx`

**修改** `src/app/[locale]/layout.tsx`

移除 `AppShell` 包装，仅保留：
```tsx
<NextIntlClientProvider messages={messages}>
  <ToasterProvider />
  {children}
</NextIntlClientProvider>
```

### Phase 5：调整 `page.tsx` 根重定向逻辑

**修改** `src/app/[locale]/page.tsx`

```tsx
// 已有 getMe()，根据是否登录跳转不同落地页
// 登录用户 → /home
// 游客 → /market（公开行情页）
```

### Phase 6：admin 布局确认

现有 `admin/layout.tsx` 已独立，无需修改。

---

## 四、文件变更清单

### 将新建
```
src/components/layout/guest-shell.tsx
src/app/[locale]/(guest)/layout.tsx
src/app/[locale]/(user)/layout.tsx
src/app/[locale]/(user)/home/HomeContent.tsx
```

### 将移动
```
(market)/home/         → (user)/home/
(market)/watchlist/   → (user)/watchlist/
(market)/stock-screen/ → (user)/stock-screen/
(market)/strategies/  → (user)/strategies/
(market)/membership/   → (user)/membership/
```

### 将修改
```
src/app/[locale]/layout.tsx          ← 移除 AppShell
src/app/[locale]/page.tsx            ← 调整根重定向
src/app/[locale]/(market)/market/    ← 移至 (guest)/market/
src/app/[locale]/(market)/blog/       ← 移至 (guest)/blog/
src/app/[locale]/(market)/stock/      ← 移至 (guest)/stock/
(market)/home/HomeContent.tsx         ← 随 home 迁至 (user)/
```

### 将删除
```
src/app/[locale]/(market)/           ← 整个路由组（内容已迁移）
```

---

## 五、验证方式

```bash
# 1. TypeScript 零错误
cd apps/web && npx tsc --noEmit

# 2. 路由冲突检查
# 确认没有两个 page.tsx 解析到同一路径

# 3. 游客访问测试
# - 未登录访问 /market → 应显示 GuestShell + 行情数据
# - 未登录访问 /blog   → 应显示 GuestShell + 博客列表
# - 未登录访问 /home   → 应 redirect 到 /login

# 4. 用户访问测试
# - 登录后访问 /home   → AppShell + 侧边栏
# - 登录后访问 /market → 仍是 GuestShell（公开数据）
# - 登录后访问 /watchlist → AppShell + 自选股

# 5. Admin 测试
# - 访问 /admin → AdminLayout 侧边栏
# - Admin 访问 /home → AppShell（不变）

# 6. 构建测试
cd apps/web && npm run build
```

---

## 六、风险与注意事项

1. **移动文件会改变 import 路径**：`HomeContent.tsx` 移到 `(user)/` 后，原有 `@/app/[locale]/(market)/home/HomeContent` 引用需更新
2. **stock-ticker** 等共享组件在 `components/` 目录，无需移动
3. **Blog 页面** 中的 `getLocale()` 从 `next-intl/server` 引入，在 `(guest)` 组内仍可用
4. **market/page.tsx** 如果有依赖 `getMe()` 的逻辑（如"添加自选"按钮），需根据游客身份条件渲染
5. **SEO**：游客页面（market/blog）需要正确的 metadata 导出

---

## 七、Phase 执行顺序

| Phase | 内容 | 风险 |
|-------|------|------|
| Phase 0 | 新建 GuestShell 组件 | 低 |
| Phase 1 | 移动 user 组文件（移动而非删除新建，避免 import 断裂） | 中 |
| Phase 2-3 | 新建 guest/user layout | 低 |
| Phase 4 | 清理根 layout | 低 |
| Phase 5 | 调整根 page.tsx | 低 |
| Phase 6 | 构建验证 + 修复 | 中 |
