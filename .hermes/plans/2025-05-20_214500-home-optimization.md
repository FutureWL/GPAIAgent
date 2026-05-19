# GPAIAgent 首页优化计划

## 目标
优化 `/zh/home` 页面内容质量，提升信息价值感和用户粘性。

---

## 当前问题清单

### 1. 热门股票区域 —— 数据硬编码
**现状：** 搜索只有 `q=茅台` 和 `q=平安` 两个固定查询，结果写死，不是真正的热门股票。
**问题：** 热门股票应该有榜单逻辑（如成交量、涨幅排名），或至少从后端获取动态列表。
**涉及文件：** `apps/web/src/app/[locale]/(user)/home/HomeContent.tsx`（第30-40行）

### 2. 最新资讯区域 —— 完全硬编码
**现状：** 3条资讯是写死的 JSX mock 数据，没有调用任何 API。
**问题：** 应该从博客/通知服务读取真实文章列表。
**涉及文件：** 同上（第195-211行）

### 3. 缺少大盘指数 Banner
**现状：** 行情数据（沪指/深证/创业板）在左侧边栏，但首页主内容区顶部没有大盘概览。
**优化方向：** 在欢迎 Banner 下方或侧边加一块实时大盘指数卡（类似理财App顶部行情条），显示沪深大盘 + 重点关注股。

### 4. 缺少 AI 信号 / 策略提示模块
**现状：** 没有专门的 AI 策略信号展示区。
**优化方向：** 在热门股票和资讯之间加一个「AI 今日信号」区块，展示 1-3 条策略信号（买入/卖出/持有）。

### 5. 搜索体验弱
**现状：** 热门股票表格内嵌搜索框，功能分散。
**优化方向：** 搜索框可保留，但热门股票应支持点击排序（涨跌幅/成交量）。

### 6. 欢迎 Banner 信息量不足
**现状：** 只有标题 + 一句介绍，装饰性圆形。
**优化方向：** 可叠加显示用户自选股涨跌幅、当日策略提示、或会员状态。

---

## 优化方案

### Step 1: 热门股票 → 改为动态 API
```
PUT 替换 fetch('/stocks/search?q=茅台/平安') 为真实热门接口
GET /stocks/hot?limit=8  (需后端实现)
若后端暂无，则保留2个query搜索但增加更多关键词：茅台/平安/宁德/比亚迪/上证50
```

### Step 2: 资讯 → 改为 API 调用
```
GET /articles?limit=3&type=news  (需后端实现)
若暂无，实现 /blog API route: app/api/articles/route.ts
```

### Step 3: 新增大盘指数 Banner
```tsx
// 位置：欢迎Banner下方，Quick Access Cards 上方
<div className="flex gap-4 overflow-x-auto">
  {indexData.map(idx => (
    <div className="flex-shrink-0 bg-card border rounded-xl px-4 py-3 min-w-[160px]">
      <div className="text-xs text-muted-foreground">{idx.name}</div>
      <div className="text-lg font-mono font-bold">{idx.price}</div>
      <div className={`text-sm font-mono ${idx.change >= 0 ? 'text-red-400' : 'text-green-400'}`}>
        {idx.change >= 0 ? '+' : ''}{idx.change} ({idx.changePercent}%)
      </div>
    </div>
  ))}
</div>
```
调用 `GET /stocks/index` 或 `GET /stocks/batch?codes=000001,399001,399006`

### Step 4: 新增「AI今日信号」区块
```tsx
<div className="bg-gradient-to-r from-amber-900/30 to-orange-900/30 border border-amber-500/20 rounded-xl p-5">
  <div className="flex items-center gap-2 mb-3">
    <Icon name={icons.Zap} className="w-4 h-4 text-amber-400" />
    <h2 className="font-semibold text-sm">AI 今日信号</h2>
  </div>
  <div className="space-y-2">
    {aiSignals.map(signal => (
      <div key={signal.id} className="flex items-center gap-3 p-3 bg-card/50 rounded-lg">
        <Badge variant={signal.type === 'BUY' ? 'destructive' : 'outline'}>{signal.type}</Badge>
        <span className="text-sm">{signal.stockName} - {signal.reason}</span>
        <span className="text-xs text-muted-foreground ml-auto">{signal.time}</span>
      </div>
    ))}
  </div>
</div>
```
调用 `GET /ai-signals/today`（需后端实现 `apps/api/src/modules/ai-signal/`）

### Step 5: 资讯 Link 指向详情
确保每条资讯点击后进入 `/blog/[id]` 而非仅 `/blog` 列表页。

---

## 涉及文件

| 文件 | 改动 |
|------|------|
| `apps/web/src/app/[locale]/(user)/home/HomeContent.tsx` | 主组件重构：新增指数Banner、AI信号、动态数据 |
| `apps/api/src/modules/article/article.controller.ts` | 新增 `GET /articles?limit=&type=` 接口 |
| `apps/api/src/modules/stock/stock.controller.ts` | 新增 `GET /stocks/hot` 和 `GET /stocks/batch` 接口 |
| `apps/api/prisma/schema.prisma` | 如需新增 Article/AiSignal 模型 |
| `apps/api/src/modules/ai-signal/` | 新建模块（controller/service/repository） |

---

## 风险与依赖

1. **后端接口依赖**：热门股票、资讯、AI信号都需要后端先有接口，前端才能调用。如后端尚未实现，需先完成 API 层。
2. **数据为空时的降级**：所有 API 调用需处理 `loading` / `error` / `empty` 三种状态。
3. **国际化**：所有新增文本需要 `locale === 'zh'` 判断双语。
4. **性能**：指数数据建议前端缓存（如 `localStorage` + 60s 过期），避免每次加载都请求。

---

## 验证步骤

1. 启动前端 `pnpm dev` 打开 `/zh/home`
2. 确认大盘指数Banner正确显示（涨红跌绿）
3. 确认热门股票表格数据来自API而非硬编码
4. 确认资讯区域数据来自API
5. 确认 AI 信号区块正常展示（如后端已实现）
6. 切换 EN 语言，所有新内容正确显示英文
7. 暗色模式下样式正常
