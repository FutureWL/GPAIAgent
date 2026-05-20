# 股票池扩展：从 93 只到全市场

## Goal

将行情中心 /market 的股票池从硬编码 93 只扩展为 **A股全市场**（约 5000+ 只），并支持按交易所/行业/概念分类筛选。

---

## 现状分析

### 数据来源

| 层 | 当前 | 问题 |
|----|------|------|
| **Prisma Stock 表** | seed 导入 93 只 | 代码写死，无法反映市场真实数量 |
| **market page** | `STOCK_CODES` 数组（93个）硬编码 + 腾讯 qt.gtimg.cn 实时行情 | 同上 |
| **行情数据** | 腾讯 qt.gtimg.cn（直连，客户端调用） | 数据源本身没问题 |

### 硬编码的 93 只股票
`STOCK_CODES` 数组分布在 `market/page.tsx` 第 29–45 行，约 93 个代码（60 只沪市 + 33 只深市），手动维护。

### 腾讯 qt.gtimg.cn 能力
腾讯行情接口支持传入任意有效的 `sh/sz/bj` 代码，不限制数量。但前端不能一次传入 5000 个（URL 过长），需要分批并发请求。

---

## 目标方案

### 核心思路
1. **扩展 Prisma Stock 表** — 运行一次批量同步脚本，从东方财富获取 A 股全量股票列表（代码/名称/上市地），写入 Stock 表
2. **前端按需加载** — market page 保留交易所切换（沪/深/京/沪ETF/深ETF）和搜索框，初始只加载 100 只（默认按市值排序前100），搜索时实时过滤
3. **复用腾讯行情 API** — 批量获取实时行情，50 个一批并发请求

### 数据源
- **东方财富 A 股列表**：`https://80.push2.eastmoney.com/api/qt/clist/get?pn=1&pz=5000&po=1&np=1&ut=bd1d9ddb04089700cf9c27f6f7426281&fltt=2&invt=2&fid=f3&fs=m:0+t:6,m:0+t:13,m:1+t:2,m:1+t:23&fields=f12,f14,f13`
  - `f12`=代码, `f14`=名称, `f13`=股票市场编码
  - `fs=m:0+t:6` 上海主板；`m:0+t:13` 科创板；`m:1+t:2` 深圳主板；`m:1+t:23` 创业板

---

## Step-by-Step Plan

### Phase 1: 数据库批量同步脚本
**文件**: `apps/api/scripts/sync-all-stocks.ts`

1. 调用东方财富股票列表 API（分沪/深/京/ETF 四个市场类别）
2. 清洗数据：去重（同名不同市场），去掉 ST/*ST/退市
3. **Upsert** 到 Prisma `Stock` 表（code + market 作为 unique key）
4. 输出同步报告：新增/更新/跳过数量

```typescript
// 伪代码
const markets = [
  { fs: 'm:0+t:6,m:0+t:13', market: 'sh' },   // 上海
  { fs: 'm:1+t:2,m:1+t:23', market: 'sz' },   // 深圳
  { fs: 'm:0+t:80', market: 'bj' },           // 北京
  { fs: 'm:0+t:14,m:1+t:14', market: 'etf' }, // ETF
];
for (const { fs, market } of markets) {
  const data = await fetchEastMoneyList(fs);
  for (const stock of data) {
    await prisma.stock.upsert({
      where: { code_market: { code: stock.code, market } },
      create: { code: stock.code, name: stock.name, market, type: 'stock' },
      update: { name: stock.name },
    });
  }
}
```

**验证**: 运行后 `npx ts-node scripts/sync-all-stocks.ts`，确认 Stock 表数量从 93 增长到 5000+

---

### Phase 2: 前端 market page 重构
**文件**: `apps/web/src/app/[locale]/(guest)/market/page.tsx`

#### 2.1 股票数据获取层
- 新增 API route `GET /api/stocks/list` — 返回 Stock 表中全量股票列表（id, code, name, market）
- market page 初始加载时 fetch `/api/stocks/list`，缓存在 `useState` 或 `useMemo` 中

#### 2.2 行情批量获取（分片并发）
```typescript
async function fetchQuotesBatched(codes: string[], concurrency = 10) {
  const chunks = chunk(codes, 50); // 腾讯每次最多 50 个
  const results = await Promise.all(
    chunks.map(chunk => fetchQuotesBatch(chunk))
  );
  return results.flat();
}
```

#### 2.3 交易所 Tab 切换
- `market: all | sh | sz | bj` — 按 market 字段过滤
- 默认显示 `all`，加载全量后取前 100（按某种排序）
- 切换 Tab 时 filter 代码列表，重新 fetch 行情

#### 2.4 搜索功能
- 搜索框实时过滤 name/code（debounce 300ms）
- 搜索结果通过 `fetchQuotesBatch` 获取行情（结果控制在 50 条以内）

#### 2.5 分页
- 保留现有分页逻辑，但用 `filteredCodes.slice((page-1)*pageSize, page*pageSize)` 派生 `displayedStocks`
- 每页 20/50/100 条

---

### Phase 3: 指数保留 + 性能优化
- 保留 `INDEX_CODES`（上证/深证/创业板）指数行情卡片（固定显示在顶部）
- 指数数据单独获取，不受 Tab/搜索影响
- 如果全量 5000 只行情加载太慢，考虑：初始只加载前 200 只，用户滚动或搜索时按需补充

---

## Files to Change

| 文件 | 改动 |
|------|------|
| `apps/api/scripts/sync-all-stocks.ts` | **新建** — 全量股票同步脚本 |
| `apps/api/src/stocks/stocks.controller.ts` | 新增 `GET /stocks/list` 端点 |
| `apps/api/src/stocks/stocks.service.ts` | 新增 `listStocks()` 方法 |
| `apps/web/src/app/[locale]/(guest)/market/page.tsx` | 重构：动态股票列表 + 分片并发行情获取 + Tab 切换 |
| `apps/web/src/app/api/stocks/list/route.ts` | **新建** — 返回 Stock 表全量列表 |

---

## Tests / Validation

1. `npx ts-node scripts/sync-all-stocks.ts` — 确认 Stock 表增长到 5000+
2. `curl http://localhost:3000/api/stocks/list` — 确认返回 JSON 数组
3. `curl http://localhost:3000/zh/market` — 页面加载，Tab 切换正常，搜索有效
4. Chrome DevTools Network — 确认行情请求是并发分片（非串行）
5. TypeScript `npx tsc --noEmit` — 零错误

---

## Risks & Tradeoffs

| 风险 | 影响 | 缓解 |
|------|------|------|
| 东方财富 API 限频/变更 | 脚本失败 | 添加 User-Agent，使用稳定版本接口 |
| 5000 只行情请求太多 | 页面加载慢/腾讯限频 | 分片 50 个一批，限制初始显示 100 只 |
| Stock 表 5000 条 | seed 再运行时重复 upsert | 用 `upsert` 而非 `create`，按 code+market 做唯一约束 |
| 北京交易所 (bj) 股票少 | 列表可能为空 | 单独处理 bj market |

---

## Open Questions

1. **ETF/债券/期货是否需要？** 当前 scope 只限 A 股主板+科创板+创业板
2. **自选股功能** — 如果用户有自选股，是否在 market 页优先显示？
3. **行情刷新频率** — 当前点击才刷新，是否加定时器自动刷新？
