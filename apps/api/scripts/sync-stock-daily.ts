/**
 * 股票历史日线数据同步脚本
 * 用法: npx ts-node scripts/sync-stock-daily.ts [股票代码...]
 * 不传参数则同步所有自选股
 *
 * 数据来源: 腾讯财经前复权日K接口
 * 定时任务: 每个交易日下午16:30后执行
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

interface DailyRecord {
  date: Date
  open: number
  close: number
  high: number
  low: number
  volume: number
  amount: number
}

async function fetchTencentDaily(qtCode: string, count = 250): Promise<DailyRecord[]> {
  const url = `https://web.ifzq.gtimg.cn/appstock/app/fqkline/get?_var=kline_dayqfq&param=${qtCode},day,,,${count},qfq`
  const resp = await fetch(url, {
    headers: { Referer: 'https://finance.qq.com', 'User-Agent': 'Mozilla/5.0' },
    signal: AbortSignal.timeout(15000),
  })
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
  const text = await resp.text()
  const jsonStr = text.replace(/^[^=]+=/, '')
  const json = JSON.parse(jsonStr) as { data: Record<string, { qfqday?: string[][]; day?: string[][] }> }
  const stockData = json.data[qtCode]
  if (!stockData) throw new Error('No data')
  const rawBars = stockData.qfqday ?? stockData.day ?? []
  return rawBars.map((bar) => ({
    date: new Date(bar[0]),
    open: parseFloat(bar[1]),
    close: parseFloat(bar[2]),
    high: parseFloat(bar[3]),
    low: parseFloat(bar[4]),
    volume: parseFloat(bar[5]),
    amount: 0,
  }))
}

async function syncStock(stockCode: string, stockId: string): Promise<number> {
  const pure = stockCode.replace(/^(sh|sz|bj)/, '')
  const qtCode = pure.startsWith('6') || pure.startsWith('5') ? `sh${pure}` : `sz${pure}`
  console.log(`  [${stockCode}] 获取历史数据...`)
  const records = await fetchTencentDaily(qtCode)
  if (records.length === 0) { console.log(`  [${stockCode}] 无数据`); return 0 }
  let upserted = 0
  for (const r of records) {
    try {
      await prisma.stockDaily.upsert({
        where: { stockId_date: { stockId, date: r.date } },
        create: { stockId, date: r.date, open: r.open, close: r.close, high: r.high, low: r.low, volume: r.volume, amount: r.amount },
        update: { open: r.open, close: r.close, high: r.high, low: r.low, volume: r.volume, amount: r.amount },
      })
      upserted++
    } catch { /* duplicate date, skip */ }
  }
  console.log(`  [${stockCode}] 写入 ${upserted} 条`)
  return upserted
}

async function syncAll() {
  const stocks = await prisma.stock.findMany({ select: { id: true, code: true } })
  console.log(`待同步 ${stocks.length} 只股票\n`)
  let total = 0
  for (const s of stocks) {
    try { total += await syncStock(s.code, s.id) }
    catch (e: any) { console.error(`  [${s.code}] 失败: ${e.message}`) }
  }
  console.log(`\n完成，共 ${total} 条`)
}

async function main() {
  const args = process.argv.slice(2)
  if (args.length > 0) {
    for (const code of args) {
      const stock = await prisma.stock.findUnique({ where: { code } })
      if (!stock) {
        const qtCode = code.startsWith('6') ? `sh${code}` : `sz${code}`
        const daily = await fetchTencentDaily(qtCode, 1)
        if (daily.length === 0) { console.error(`[${code}] 无数据`); continue }
        const market = code.startsWith('6') ? 'sh' : 'sz'
        const created = await prisma.stock.create({ data: { code, name: `股票${code}`, market, type: 'stock' } })
        await syncStock(code, created.id)
      } else {
        await syncStock(stock.code, stock.id)
      }
    }
  } else {
    await syncAll()
  }
}

main().catch(console.error).finally(() => prisma.$disconnect())
