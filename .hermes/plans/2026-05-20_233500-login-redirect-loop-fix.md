# 修复登录后不跳转 — 停留在登录页

## Goal

登录成功后能正确跳转到 `/{locale}/home`，不再停留在登录页。

## 根因分析

**调用链追踪：**

1. 用户登录 → `POST /api/auth/login` → 成功（201，Set-Cookie 已透传）
2. `router.push(\`/${locale}/home\`)` → 跳转到 `/zh/home`
3. `/zh/home` 布局或页面使用了 `useAuth()` hook（`requireAuth=true`）
4. `useAuth` 调用 `apiFetch('/auth/me')` 验证登录态
5. `apiFetch` 路径拼接：`${API_BASE_URL}/auth/me`
   - `API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? ''`
   - `.env.dev` 中该变量**不存在**，所以 `API_BASE_URL = ''`
   - 实际请求：`/auth/me`（相对路径，发送到 Next.js server）
6. **Next.js 没有 `/api/auth/me` 这个 route**，后端也没有 `/auth/me` 接口对应
   - 返回 404（或 401），导致 `fetchMe()` 抛出异常
7. `useAuth` 检测到 `user === null`，重定向回 `/login`
8. 用户看到"登录后又回到登录页"

## 关键问题

| 问题 | 位置 | 说明 |
|------|------|------|
| 缺少 `/api/auth/me` route | `apps/web/src/app/api/auth/me/route.ts` | 验证登录态用，缺失 |
| `apiFetch` 用相对路径 `/auth/me` | `apps/web/src/lib/api.ts` | 需要 rewrite 或代理 |
| `NEXT_PUBLIC_API_BASE_URL` 未设置 | `.env.dev` | 应指向 `http://127.0.0.1:3002` |

## 修复方案

### Step 1：创建 `/api/auth/me` route

路径：`apps/web/src/app/api/auth/me/route.ts`

代理 `GET /auth/me` 到 NestJS 后端，返回当前用户信息。

NestJS `/auth/me` 接口存在（auth controller 里有 `me()` 方法），所以直接透传即可。

### Step 2：验证 auth middleware

检查 Next.js 是否有 middleware 拦截请求导致跳转逻辑异常。

## 文件变更

- **新增** `apps/web/src/app/api/auth/me/route.ts`
- **可选修改** `.env.dev` — 添加 `NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:3002`（如果 `apiFetch` 需要直连后端）

## 验证步骤

1. 启动浏览器无痕模式，清空 cookie
2. 打开 `http://localhost:3000/zh/login`
3. 登录 → 应跳转到 `/zh/home`
4. 刷新 `/zh/home` → 应保持登录态，不跳回 login
