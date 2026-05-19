# 游客 UI 重新设计方案

**日期**: 2026-05-20
**目标**: 将游客界面打造为具有专业金融产品气质的公开门面

---

## 一、现状问题诊断

### market/page.tsx（行情页）— 问题最严重

| 问题 | 说明 |
|------|------|
| 硬编码 `bg-slate-800` 背景 | 暗色写死，亮色模式白屏 |
| 纯数据表格，无品牌感 | 像券商原始数据，不像个产品 |
| 涨跌颜色写反 | `up ? 'text-red-400' : 'text-green-400'` — 用户确认 A股：涨红跌绿 |
| 无分页/虚拟滚动 | 100 条数据全量渲染，性能差 |
| 搜索框纯 HTML 无组件化 | `bg-slate-800 border border-slate-700` 写死 |
| 无响应式 | mobile 上表格溢出 |

### blog/page.tsx（博客列表）

| 问题 | 说明 |
|------|------|
| 无 Hero 区域 | 直接列表，没有品牌感 |
| 封面图不存在时无占位 | 纯文本列表偏素 |
| shadcn Card 已用但缺少层次 | 网格布局和间距未优化 |

### stock/[code]/page.tsx（个股详情）

| 问题 | 说明 |
|------|------|
| `bg-slate-800` 写死 | 同上，暗色模式硬编码 |
| 行情卡片纯 div+inline style | 应使用 shadcn Card + CSS 变量 |
| "加入自选" 按钮用原生 button | 应用 shadcn Button |
| 无移动端 K 线图适配 | 高度写死 360px |

### GuestShell（顶栏导航）

| 问题 | 说明 |
|------|------|
| 无品牌视觉层 | 只有文字 logo，缺乏金融产品气质 |
| 缺少 Hero/Landing 页 | `/market` 直接进数据表，游客没有引导 |
| footer 简陋 | 仅有文字链接 |

---

## 二、设计语言定义

### 色彩系统（基于 shadcn CSS 变量）

```
--foreground:        #09090b   (primary text)
--muted:            #f4f4f5   (light) / #27272a (dark)
--card:             #ffffff   (light) / #09090b (dark)
--border:           #e4e4e7   (light) / #27272a (dark)
--primary:           #2563eb   (brand blue)
--primary-foreground: #ffffff
--accent:           #f4f4f5   (light) / #27272a (dark)
```

涨跌色（**A股标准**，用户已确认）：
```
涨（up）:  #ef4444  (red-500)
跌（down）: #22c55e  (green-500)
```

### 字体

- 标题：`font-bold tracking-tight`
- 数据：`font-mono text tabular-nums`（数字等宽对齐）

### 动效

- Page transitions: `transition-colors duration-200`
- Hover states: `hover:bg-accent`
- Cards: `hover:shadow-md transition-shadow`

---

## 三、重构方案

### Phase 1: GuestShell 品牌化

**目标**: 让游客从 URL 输入到落地的第一眼有"这是一个专业金融平台"的感觉

**文件**: `src/components/layout/guest-shell.tsx`

- 顶部导航增加渐变底边（`border-b border-border` 已有，保留）
- Logo 区增加图标背景（`bg-primary/10 rounded-lg p-1.5`）
- 增加顶部公告/标语区（可配置）
- Footer 加入平台许可证和社交链接

### Phase 2: market/page.tsx 全面重构

**目标**: 行情页从"数据表"变"专业金融终端"

**文件**: `src/app/[locale]/(guest)/market/page.tsx`

#### 布局重构
```
Hero 区域（标题 + 搜索 + 实时状态）
  ↓
指数概览卡片区（沪/深/创 三大指数 horizontal scroll）
  ↓
自选股快捷入口（已登录用户）/ 热门股票（游客）
  ↓
全市场表格（VirtualScroll 或分页）
```

#### 组件化
- 搜索框 → shadcn `Input` 组件
- 股票行 → `StockRow` 组件，颜色用 CSS 变量 + 涨跌色
- 指数卡片 → `IndexCard` 组件
- 表格容器 → shadcn `Card` 包装

#### 涨跌色修复
```tsx
// 修正：A股标准
const up = s.change >= 0;
color={up ? '#ef4444' : '#22c55e'}
bg-up={up ? 'bg-red-500/10' : 'bg-green-500/10'}  // 仅在需要强调时用背景
```

### Phase 3: stock/[code]/page.tsx 样式修复

**文件**: `src/app/[locale]/(guest)/stock/[code]/page.tsx`

- 移除所有 `bg-slate-800`，改用 `bg-card border border-border`
- 行情卡片 → shadcn `Card` + CSS 变量
- "加入自选" → shadcn `Button`
- 涨跌色统一用 CSS 变量或 Tailwind 涨跌色工具类
- K 线图高度响应式：`h-[360px] sm:h-[480px]`

### Phase 4: blog/page.tsx 增强

**文件**: `src/app/[locale]/(guest)/blog/page.tsx`

- 增加 Hero 区域（标题 + 副标题 + 背景渐变）
- 博客卡片增加封面图占位（无图时用 gradient 占位）
- 网格布局：`grid-cols-1 md:grid-cols-2 lg:grid-cols-3`

---

## 四、实施文件清单

| 文件 | 动作 | 优先级 |
|------|------|--------|
| `src/components/layout/guest-shell.tsx` | 重构品牌化 | P1 |
| `src/app/[locale]/(guest)/market/page.tsx` | 完全重写 | P1 |
| `src/app/[locale]/(guest)/stock/[code]/page.tsx` | 样式修复 | P2 |
| `src/app/[locale]/(guest)/blog/page.tsx` | 增强 | P2 |
| `src/styles/globals.css` | 补充涨跌色 CSS 变量 | P1 |

---

## 五、风险与 Tradeoffs

**风险**: 大量改动 market/page.tsx（248 行），涉及数据获取逻辑。

**对策**: 保持所有数据获取逻辑不变，只改 JSX 结构和 className。

**Open Question**: GuestShell 是否需要 Hero Landing 页面（一个带 Banner 的首页），还是直接在 `/market` 展现品牌？
→ 建议：**不要单独 Landing 页**，直接让 `/market` 本身成为品牌展示页，Hero 即表格上方的标题区。

---

## 六、验证步骤

1. `npm run build` 通过
2. `npx tsc --noEmit` 零错误
3. 亮色模式下 `/zh/market` 和 `/zh/blog` 视觉正常（非白屏/无异常）
4. 暗色模式下 `/zh/market` 和 `/zh/blog` 视觉正常
5. 涨跌颜色：涨（红）跌（绿）正确
