# 行情中心分页功能计划

**日期**: 2026-05-20
**目标**: 为行情表格增加分页，支持切换页码和每页条数

---

## 一、现状

当前 `market/page.tsx` 的表格逻辑：
- 一次加载所有股票（全量）
- `displayedStocks` = `allStocks.filter(...).slice(0, 100)` — 硬截断前100条
- 无分页控件

---

## 二、方案

### 分页设计

| 参数 | 值 |
|------|-----|
| 每页条数 | 20（默认）/ 50 / 100 可选 |
| 最大页数 | `Math.ceil(非指数股票总数 / pageSize)` |
| 切换页码 | 重置 `displayedStocks` 起点 |

### 界面控件

在"全部股票"标题右侧增加：
1. **页码信息**：`第 1-${pageSize} 条 / 共 N 条`
2. **分页按钮组**：`«` 第一页 / `‹` 上一页 / 页码 / `›` 下一页 / `»` 末页
3. **每页条数选择器**：下拉或 Button group：`20 / 50 / 100`

### 文件变更

```
apps/web/src/app/[locale]/(guest)/market/page.tsx
```

**需要新增 state**：
- `currentPage: number`（默认 1）
- `pageSize: number`（默认 20）

**displayedStocks 逻辑变更**：
```tsx
const nonIndexStocks = allStocks.filter(s => !s.isIndex);
const totalCount = nonIndexStocks.length;
const start = (currentPage - 1) * pageSize;
const pagedStocks = search.trim()
  ? filteredStocks.slice(start, start + pageSize)
  : nonIndexStocks.slice(start, start + pageSize);
```

**页码重算触发条件**：
- `search` 变化 → 重置 `currentPage = 1`
- `pageSize` 变化 → 重置 `currentPage = 1`

---

## 三、实施步骤

1. 新增 `currentPage` + `pageSize` state
2. 将硬截断 `.slice(0, 100)` 替换为分页切片
3. 新增分页控件组件（内联在 market/page.tsx 中，不拆文件）
4. 处理边界：`currentPage` 超出范围时自动归 1

---

## 四、验证

- `http://localhost:3000/zh/market` — 分页控件显示正常
- 点击第2页 → 显示第 21-40 条
- 搜索 → 重置到第1页
- 切换 pageSize → 重置到第1页，数据量变化
- TypeScript 零错误
