import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async check() {
    const checks = {
      api: { status: 'ok', timestamp: new Date().toISOString() },
      database: { status: 'unknown' as 'ok' | 'error', latency: 0 },
      external: { status: 'unknown' as 'ok' | 'error', latency: 0 },
    };

    // 数据库检查
    const dbStart = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      checks.database = { status: 'ok', latency: Date.now() - dbStart };
    } catch (e: any) {
      checks.database = { status: 'error', latency: Date.now() - dbStart };
    }

    // 外部数据源检查（腾讯K线接口）
    const extStart = Date.now();
    try {
      const url = 'https://web.ifzq.gtimg.cn/appstock/app/fqkline/get?param=sh600519,day,,,1,qfq';
      const resp = await fetch(url, {
        headers: { Referer: 'https://finance.qq.com', 'User-Agent': 'Mozilla/5.0' },
        signal: AbortSignal.timeout(5000),
      });
      checks.external = resp.ok
        ? { status: 'ok', latency: Date.now() - extStart }
        : { status: 'error', latency: Date.now() - extStart };
    } catch {
      checks.external = { status: 'error', latency: Date.now() - extStart };
    }

    const allOk = checks.database.status === 'ok' && checks.external.status === 'ok';
    return {
      status: allOk ? 'healthy' : 'degraded',
      ...checks,
    };
  }
}
