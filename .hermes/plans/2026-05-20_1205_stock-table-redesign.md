# Stock 表重新建模：从 93 只到全市场

## Goal

重建 `Stock` 表数据模型，支持 A 股全市场（约 5000 只股票），支持按市场/行业/状态过滤和搜索，为行情中心页面提供完整的数据底座。

---

## 当前问题

| 问题 | 说明 |
|------|------|
| `code @unique` 错误 | 同码不同市场（如 `sh000001` 上证指数 vs `sz000001` 平安银行），现有约束会冲突 |
| `market` 无枚举约束 | 写死字符串，无类型安全 |
| 无行业字段 | 无法按行业筛选 |
| 无状态字段 | 无法区分上市/暂停/退市 |
| 无上市日期 | 新股/次新股筛选无从做起 |

---

## 新数据模型

### Prisma Schema 改动

```prisma
model Stock {
  id        String   @id @default(cuid())
  code      String             // 如 "600519"（纯数字，无前缀）
  name      String             // 如 "贵州茅台"
  market    StockMarket        // sh / sz / bj
  type      StockType          // stock / bond / fund / index / etf
  status    StockStatus        @default(LISTED) // LISTED / SUSPENDED / DELISTED
  industry  String?            // 申万行业一级，如 "食品饮料"
  subIndustry String?          // 申万行业二级，如 "白酒"
  listDate  DateTime?          // 上市日期
  totalShares Float?           // 总股本（万股）
  circulateShares Float?       // 流通股本（万股）
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // 关联
  userStocks    UserStock[]
  dailyData     StockDaily[]
  periodKlines  StockPeriodKline[]
  quotes        StockQuote[]
  strategies    Strategy[]
  aiGenerations AIGeneration[]
  stockScreenResults StockScreenResult[]

  // 修复：code + market 联合唯一（解决同码不同市场问题）
  @@unique([code, market])
  @@index([market, status])
  @@index([industry])
  @@index([type])
}

enum StockMarket {
  SH  // 上海
  SZ  // 深圳
  BJ  // 北京
}

enum StockType {
  stock  // 普通股
  bond   // 债券
  fund   // 基金
  index  // 指数
  etf    // ETF
}

enum StockStatus {
  LISTED    // 正常上市
  SUSPENDED // 暂停上市
  DELISTED  // 退市
}
```

### 字段说明

| 字段 | 来源 | 说明 |
|------|------|------|
| `code` | 东方财富 `f12` | 纯数字代码，不含 sh/sz 前缀 |
| `name` | 东方财富 `f14` | 股票名称 |
| `market` | 东方财富 `f13` 或推导 | SH/SZ/BJ |
| `type` | 东方财富 `f100` 或市场 | stock/bond/fund/index/etf |
| `status` | 东方财富 `f128` | LISTED/SUSPENDED/DELISTED |
| `industry` | 东方财富 `f100` 行业分类 | 申万一级行业 |
| `listDate` | 东方财富 `f136` | 上市日期 |
| `totalShares` | 东方财富 `f115` | 总股本（万股） |
| `circulateShares` | 东方财富 `f135` | 流通股本（万股） |

---

## 数据同步流程

### 数据源
东方财富股票列表 API（`push2.eastmoney.com`），按市场分页获取：

```
GET https://80.push2.eastmoney.com/api/qt/clist/get
  ?pn=1&pz=5000
  &po=1&np=1
  &fltt=2&invt=2
  &fid=f3
  &fs=m:0+t:6,m:0+t:13    ← 上海主板+科创板
  &fs=m:1+t:2,m:1+t:23   ← 深圳主板+创业板
  &fs=m:0+t:80            ← 北京
  &fields=f12,f13,f14,f100,f128,f136,f115,f135
```

### 同步脚本
**文件**: `apps/api/scripts/sync-all-stocks.ts`

1. 并发请求四个市场的股票列表（Promise.all）
2. 清洗数据：去掉 ST/*ST/退市，trim 名称
3. Upsert 到 Stock 表（`@@unique([code, market])` 保证不会因 code 冲突）
4. 输出报告：total / inserted / updated / skipped / errors

### 同步策略
- **首次全量同步**：获取全部 ~5000 只，写入 DB
- **日常增量同步**：每日开盘前跑一次，只更新变化（名称/状态）
- **可选字段**（industry/subIndustry/listDate）：东方财富完整字段多，可逐步扩展

---

## API 层改动

### 新增 Service 方法

```typescript
// stocks.service.ts

// 全量股票列表（分页，支持过滤）
async listStocks(params: {
  market?: StockMarket;
  type?: StockType;
  status?: StockStatus;
  industry?: string;
  search?: string;     // 按代码或名称模糊搜索
  page?: number;
  pageSize?: number;
}) {
  const where = { ... };
  const [data, total] = await Promise.all([
    this.prisma.stock.findMany({ where, skip, take, orderBy: { code: 'asc' } }),
    this.prisma.stock.count({ where }),
  ]);
  return { data, total, page, pageSize };
}

// 同步全量股票（供脚本调用）
async syncAllStocksFromEastMoney(): Promise<SyncReport> { ... }
```

### 新增 Controller 端点

```
GET /stocks?market=SH&type=stock&status=LISTED&industry=食品饮料&search=茅台&page=1&pageSize=50
```

---

## 前端改动

### market page 重构

```
┌─────────────────────────────────────────────────────────┐
│  [全部] [沪市] [深市] [京市] [ETF]   🔍 搜索...         │
│  行业: [全部▼]  状态: [上市▼]                           │
├─────────────────────────────────────────────────────────┤
│  指数卡片区（上证/深证/创业板，固定不变）                 │
├─────────────────────────────────────────────────────────┤
│  代码    名称      最新价  涨跌幅  成交量  成交额  市值  │
│  ─────────────────────────────────────────────────────  │
│  600519  贵州茅台  1698.00 +1.2%  1200万  20亿   2.1万亿│
│  ...                                                    │
├─────────────────────────────────────────────────────────┤
│  共 4582 只  |  [20] [50] [100] | « ‹ 1 2 3... › »     │
└─────────────────────────────────────────────────────────┘
```

**流程**:
1. 页面加载 → `GET /stocks?market=SH&status=LISTED&pageSize=20` → 获取 Stock 列表
2. 提取 codes 数组 → 分片并发请求腾讯行情 → 合并渲染
3. 搜索 → `GET /stocks?search=茅台` → 前端 debounce 300ms → 提取 codes → fetchQuotesBatch

---

## 执行计划

### Step 1: Schema 迁移
```
npx prisma migrate dev --name stock_redesign
```
- 新增 `StockMarket`/`StockType`/`StockStatus` 枚举
- `code @unique` → `@@unique([code, market])`
- 新增 `status`/`industry`/`listDate` 等字段
- **注意**: 需要先删除/迁移旧数据（93 条 seed 数据可重新同步）

### Step 2: 同步脚本
- 创建 `apps/api/scripts/sync-all-stocks.ts`
- 东方财富接口请求 + 清洗 + Upsert
- 首次运行验证 Stock 表 ~5000 条

### Step 3: API 层
- `stocks.service.ts` 新增 `listStocks()` + `syncAllStocksFromEastMoney()`
- `stocks.controller.ts` 新增 `GET /stocks` 端点

### Step 4: 前端集成
- market page 改为 API 驱动，移除硬编码 `STOCK_CODES`
- Tab 切换 + 筛选器 + 分页，均走 API

### Step 5: 验证
- `curl "http://localhost:3000/stocks?market=SH&pageSize=5"` → 确认返回
- market page 页面加载，搜索茅台 → 找到贵州茅台
- `npx tsc --noEmit` → 零错误

---

## 风险与注意事项

1. **迁移期间数据丢失**：`code @unique` 改为 `@@unique([code, market])` 后，旧 seed 数据中的重复 code（如 000001 同时存在于 sh 和 sz）会触发唯一约束冲突。需要先清空 Stock 表再重新同步。
2. **东方财富 API 稳定性**：生产环境应考虑添加请求重试和 User-Agent 伪装。
3. **全量同步耗时**：~5000 只股票 Upsert 预计 30–60 秒，需后台运行。

---

## Open Questions

1. **北交所 (BJ) 股票是否纳入？** — 当前方案已含 BJ
2. **指数/ETF 是否需要单独管理？** — `type` 字段已区分，但 `/market` 页面默认只显示 `type=stock`，ETF 通过 Tab 切换显示
3. **实时行情如何结合 DB 数据？** — DB 只做股票元数据存储，行情始终来自腾讯实时 API（`qt.gtimg.cn`），DB 不存实时价格
