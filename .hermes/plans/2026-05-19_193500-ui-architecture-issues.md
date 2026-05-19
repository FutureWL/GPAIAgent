# GPAIAgent UI 架构问题诊断与整改计划

**日期**: 2026-05-19
**目标**: 系统性梳理当前 UI 架构的不合理之处，给出优先级排序的整改路线图

---

## 一、问题总览

| # | 问题 | 严重度 | 影响范围 |
|---|------|--------|---------|
| P0-1 | 重复 AppShell 组件（废弃件未删除） | 严重 | 长期维护混乱 |
| P0-2 | `getMe()` 在 4 处重复定义 | 严重 | 维护性/一致性 |
| P1-1 | Settings 页面未接入国际化 | 高 | 中英文用户 |
| P1-2 | Admin 导航硬编码 `/zh/` 路径 | 高 | 英文 locale 失效 |
| P1-3 | antd 暗色模式未接入 | 高 | 暗色主题下组件白屏 |
| P2-1 | 移动端适配完全缺失 | 中 | 移动端不可用 |
| P2-2 | `providers.tsx` 废弃件未删除 | 低 | 死代码 |
| P2-3 | StockTicker 背景使用硬编码色 | 低 | 主题切换后不一致 |
| P3-1 | 登录页手动设置 token cookie | 低 | 冗余操作 |
| P3-2 | `sidebar.tsx` 折叠状态未持久化 | 低 | 用户体验 |

---

## 二、详细分析

### P0-1：重复 AppShell 组件

**现状**:
- `src/components/AppShell.tsx` — 旧组件，使用 emoji 导航、slate 暗色背景、硬编码中英文
- `src/components/layout/appshell.tsx` — 新组件，shadcn/ui 结构化组件

**问题**:
- `AppShell.tsx` 完全未被引用（grep 确认只有自身文件引用自己）
- 两个组件职责重叠，新旧设计语言混用
- `AppShell.tsx` 是遗留死代码，必须删除

**修复**: 删除 `src/components/AppShell.tsx`

---

### P0-2：`getMe()` 在 4 处重复定义

**现状**（完全相同的逻辑重复了 4 次）:
```
src/app/[locale]/layout.tsx          — async function getMe()
src/app/[locale]/page.tsx            — async function getMe()
src/app/[locale]/home/page.tsx       — async function getMe()
src/app/[locale]/profile/page.tsx    — async function getMe()
```

**问题**:
- 相同逻辑重复 4 份，改一处要改 4 处
- 每个 page 各自调用 `getMe()`，无法共享缓存
- Next.js App Router 可以通过 `generateStaticParams` / Server Component 缓存减少重复请求

**修复**:
```typescript
// src/lib/auth.ts — 统一的认证数据获取
export async function getMe() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('gpai_access_token');
    if (!token) return null;
    const res = await fetch(`http://localhost:3001/auth/me`, {
      headers: { Cookie: `gpai_access_token=${token.value}` },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}
```
所有 page 改为 `import { getMe } from '@/lib/auth'`

---

### P1-1：Settings 页面未接入国际化

**现状**: `settings/page.tsx` 全部硬编码中文标签
```tsx
<h2 className="text-lg font-semibold text-gray-800">账户设置</h2>
<Form.Item label="显示名称" name="name">
```

**问题**: 英文 locale 用户访问 settings 页面看到中文

**修复**: 将硬编码中文替换为 `useTranslations()` 或 `locale` 判断分支

---

### P1-2：Admin 导航硬编码 `/zh/` 路径

**现状**:
```typescript
// admin/layout.tsx
const navItems = [
  { href: '/zh/admin', label: '仪表盘', ... },
  { href: '/zh/admin/users', label: '用户管理', ... },
]
```

**问题**: 英文 locale 用户导航到 `/en/admin` 后，点击任何导航项会跳回 `/zh/admin`

**修复**:
```typescript
// 使用 locale 参数动态生成路径
const navItems = (locale: string) => [
  { href: `/${locale}/admin`, label: locale === 'zh' ? '仪表盘' : 'Dashboard', ... },
  ...
]
```

---

### P1-3：antd 暗色模式未接入

**现状**: antd 组件（Form、Input、Select 等）在暗色主题下显示白底，ConfigProvider 的 `algorithm: theme.darkAlgorithm` 未配置。

**问题**: Settings 页面、Login 页面中的 antd 组件在暗色模式下不可用

**修复**: 在 RootLayout 或 Providers 中配置 antd ConfigProvider：
```tsx
<ConfigProvider theme={{ algorithm: theme.darkAlgorithm, ... }}>
  {children}
</ConfigProvider>
```
需注意: ConfigProvider 需要在 antd 组件 mount 之前配置好，且需要 SSR 对齐处理。

---

### P2-1：移动端适配完全缺失

**现状**: Sidebar 宽度 224px/64px，在移动端直接溢出；无 hamburger 菜单；Admin 和 Market layout 完全相同问题

**问题**: 移动设备访问主页体验极差

**修复**:
- Sidebar → Drawer（`@radix-ui/react-dialog` 或 antd Drawer）
- 移动端隐藏 Sidebar，点击 hamburger 按钮展开 Drawer
- Admin 页面的 hamburger 菜单可折叠/展开侧边栏

---

### P2-2：`providers.tsx` 废弃件未删除

**现状**: `src/components/providers.tsx` 定义了一个包含 `<Toaster>` 的 Providers 组件，但在 Phase 1 整改中已经将 Toaster 移到了 `toaster-provider.tsx`，此文件已无引用。

**修复**: 删除 `src/components/providers.tsx`

---

### P2-3：StockTicker 颜色未使用 CSS 变量

**现状**:
```tsx
// stock-ticker.tsx
className="h-8 bg-primary/90 text-white/80"
```
使用硬编码的 Tailwind 颜色，而非 `bg-background` / `text-foreground` CSS 变量。

**问题**: 主题切换后 ticker 背景可能不协调

**修复**: 改用 CSS 变量或 Tailwind 语义化颜色类

---

### P3-1：登录页手动设置 cookie（冗余）

**现状**:
```tsx
document.cookie = `gpai_access_token=${data.token}; path=/; max-age=${7 * 24 * 60 * 60}`;
router.push(`/${locale}/home`);
```
同时服务端 Response Header 也设置了 HttpOnly cookie，登录页又手动设置了一份。

**问题**: 冗余；手动设置的 cookie 非 HttpOnly 存在安全风险

**修复**: 移除手动 cookie 设置，只依赖服务端 Set-Cookie 头

---

### P3-2：Sidebar 折叠状态未持久化

**现状**: `sidebar.tsx` 折叠状态存储在 React `useState`，刷新页面后恢复默认。

**修复**: 使用 `localStorage` 持久化：
```tsx
const [collapsed, setCollapsed] = useState(() => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('sidebar-collapsed') === 'true';
  }
  return false;
});
```

---

## 三、整改计划

### Phase 0：清理死代码（P0 级，0.5 天）
1. 删除 `src/components/AppShell.tsx`
2. 删除 `src/components/providers.tsx`
3. 删除 `src/app/[locale]/(market)/home/layout.tsx`（空文件）
4. 删除 `src/app/[locale]/(market)/layout.tsx`（空文件）
5. 删除 `src/app/[locale]/(auth)/layout.tsx`（空文件）

### Phase 1：消除重复逻辑（P0 级，0.5 天）
1. 创建 `src/lib/auth.ts`，提取统一的 `getMe()`
2. 重构 `layout.tsx`、`page.tsx`、`home/page.tsx`、`profile/page.tsx` 使用统一函数
3. 删除各 page 中的重复 `getMe()` 定义

### Phase 2：修复国际化（P1 级，1 天）
1. 修复 admin/layout.tsx 导航路径，使用 locale 参数
2. 将 settings/page.tsx 硬编码中文替换为 locale 判断
3. 考虑建立 `messages/zh.json` / `messages/en.json` 完整翻译文件

### Phase 3：暗色模式支持（P1 级，1-2 天）
1. 配置 antd ConfigProvider 暗色算法
2. 全局检查 antd 组件暗色表现
3. StockTicker 颜色改为语义化 Tailwind 类

### Phase 4：移动端适配（P2 级，1-2 天）
1. Sidebar 改 Drawer 组件
2. Admin 侧边栏 hamburger 折叠
3. 响应式断点测试

### Phase 5：体验优化（P3 级，0.5 天）
1. 移除登录页冗余 cookie 设置
2. Sidebar 折叠状态 localStorage 持久化

---

## 四、文件变更清单

### 将删除的文件
- `src/components/AppShell.tsx`
- `src/components/providers.tsx`
- `src/app/[locale]/(market)/home/layout.tsx`
- `src/app/[locale]/(market)/layout.tsx`
- `src/app/[locale]/(auth)/layout.tsx`

### 将修改的文件
- `src/app/[locale]/layout.tsx` — 使用统一的 `getMe()`
- `src/app/[locale]/page.tsx` — 删除重复 `getMe()`
- `src/app/[locale]/home/page.tsx` — 删除重复 `getMe()`
- `src/app/[locale]/profile/page.tsx` — 删除重复 `getMe()`
- `src/app/[locale]/admin/layout.tsx` — 动态 locale 路径
- `src/app/[locale]/settings/page.tsx` — 接入国际化
- `src/app/[locale]/(auth)/login/page.tsx` — 移除冗余 cookie
- `src/components/layout/sidebar.tsx` — localStorage 持久化
- `src/components/stocks/stock-ticker.tsx` — CSS 变量化颜色
- `src/app/layout.tsx` — antd ConfigProvider（暗色算法）

### 将新建的文件
- `src/lib/auth.ts` — 统一 `getMe()` 函数

---

## 五、验证方式

```bash
# 1. TypeScript 零错误
cd apps/web && npx tsc --noEmit

# 2. 死代码检查
grep -r "AppShell\|providers.tsx" src/ --include="*.tsx"
# 应无输出

# 3. 路由测试
# 英文 locale 访问 admin 页面，导航链接应为 /en/admin/* 而非 /zh/admin/*

# 4. 暗色模式截图验证
# 切换到暗色主题，settings 页面的 antd 组件应正确暗色化

# 5. 移动端断点测试
# 320px 宽度下，sidebar 应隐藏，点击 hamburger 展开 Drawer
```
