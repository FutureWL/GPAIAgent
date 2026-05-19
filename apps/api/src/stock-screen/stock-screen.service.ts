import { Injectable, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { MembershipService } from '../membership/membership.service';
import { StocksService } from '../stocks/stocks.service';
import { CreateScreenDto, ScreenCriteria } from './dto/create-screen.dto';
import { Prisma } from '@prisma/client';

type RiskLevel = 'risk_high' | 'profit_high' | 'neutral' | 'avoid';

const RISK_LABELS: Record<RiskLevel, string> = {
  risk_high: '风险大于收益',
  profit_high: '收益大于风险',
  neutral: '可买可不买',
  avoid: '不建议关注',
};

export interface StockWithQuote {
  code: string;
  name: string;
  market: string;
  type: string;
  latestPrice?: number;
  priceChange?: number;
  priceChangePct?: number;
  volume?: number;
  turnoverRate?: number;
  marketCap?: number;
  netInflow?: number;
  amount?: number;
}

@Injectable()
export class StockScreenService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly membershipService: MembershipService,
    private readonly configService: ConfigService,
    private readonly stocksService: StocksService,
  ) {}

  async screenStocks(criteria: ScreenCriteria, limit = 50): Promise<StockWithQuote[]> {
    const where: Record<string, unknown> = {};
    if (criteria.market && criteria.market !== 'all') {
      where.market = criteria.market;
    }
    if (criteria.type) {
      where.type = criteria.type;
    }

    const stocks = await this.prismaService.stock.findMany({
      where,
      take: 500,
    });

    const codes = stocks.map((s) => `${s.market}${s.code}`);
    const quotes = await this.stocksService.getBatchQuotes(codes);

    const results: StockWithQuote[] = [];

    for (const stock of stocks) {
      const quote = quotes.find(
        (q) =>
          q.code === stock.code ||
          q.code === `${stock.market}${stock.code}` ||
          q.name === stock.name,
      );

      if (!quote) continue;

      const priceChangePct = quote.changePercent ?? 0;
      const turnoverRate = quote.turnover;
      const volume = quote.volume;
      const marketCap = quote.circulateCap;
      const netInflow = quote.netInflow;
      const amount = quote.amount;

      if (criteria.priceChangeMin !== undefined && priceChangePct < criteria.priceChangeMin) continue;
      if (criteria.priceChangeMax !== undefined && priceChangePct > criteria.priceChangeMax) continue;
      if (criteria.turnoverRateMin !== undefined && (turnoverRate ?? 0) < criteria.turnoverRateMin) continue;
      if (criteria.turnoverRateMax !== undefined && (turnoverRate ?? 0) > criteria.turnoverRateMax) continue;
      if (criteria.volumeMin !== undefined && (volume ?? 0) < criteria.volumeMin) continue;
      if (criteria.volumeMax !== undefined && (volume ?? 0) > criteria.volumeMax) continue;
      if (criteria.marketCapMin !== undefined && (marketCap ?? 0) < criteria.marketCapMin) continue;
      if (criteria.marketCapMax !== undefined && (marketCap ?? 0) > criteria.marketCapMax) continue;
      if (criteria.netInflowMin !== undefined && (netInflow ?? 0) < criteria.netInflowMin) continue;
      if (criteria.netInflowMax !== undefined && (netInflow ?? 0) > criteria.netInflowMax) continue;

      results.push({
        code: stock.code,
        name: stock.name,
        market: stock.market,
        type: stock.type,
        latestPrice: quote.price,
        priceChange: quote.change,
        priceChangePct: priceChangePct,
        turnoverRate,
        volume,
        marketCap,
        netInflow,
        amount,
      });

      if (results.length >= limit) break;
    }

    results.sort((a, b) => (b.priceChangePct ?? 0) - (a.priceChangePct ?? 0));

    return results;
  }

  async aiScreen(userId: string, description: string) {
    const access = await this.membershipService.checkAccess(userId);
    if (!access.hasAccess) {
      throw new ForbiddenException('该功能仅对会员开放，请先购买会员');
    }

    const apiKey = this.configService.get<string>('MINIMAX_API_KEY');
    if (!apiKey) {
      throw new Error('MiniMax API Key 未配置');
    }

    const stocks = await this.prismaService.stock.findMany({
      take: 100,
      orderBy: { createdAt: 'desc' },
    });

    const codes = stocks.map((s) => `${s.market}${s.code}`);
    const quotes = await this.stocksService.getBatchQuotes(codes);

    const stockList = quotes
      .filter((q) => q.price > 0)
      .sort((a, b) => (b.amount ?? 0) - (a.amount ?? 0))
      .slice(0, 30)
      .map((q) => {
        return `${q.name}(${q.code}) 现价:${q.price} 涨跌:${q.changePercent}% 换手率:${q.turnover ?? '-'}% 流通市值:${q.circulateCap ?? '-'}亿 净流入:${q.netInflow ?? '-'}万`;
      })
      .join('\n');

    const systemPrompt = `你是一个专业的股票选股助手。你的职责是根据用户的描述，从候选股票列表中筛选出符合条件的股票，并给出简要点评。

合规要求：
- 不得预测具体涨跌
- 不得推荐买卖具体股票
- 只能输出以下四种结论之一：风险大于收益 / 收益大于风险 / 可买可不买 / 不建议关注
- 最多返回5只股票

输出格式（严格遵循）：
## 选股理由
[说明为什么选这些股票，100字以内]

## 入选股票
[每只股票一行，格式：股票名称(代码)：简要点评（50字以内）]

## 整体风险标签
[从以下四项选择最合适的：风险大于收益 | 收益大于风险 | 可买可不买 | 不建议关注]

## 合规声明
以上内容仅供参考，不构成投资建议。投资有风险，决策需谨慎。`;

    const userPrompt = `用户需求：${description}

候选股票（成交额前30）：
${stockList}

请根据用户需求从候选股票中选择最符合条件的（最多5只）。`;

    let aiResult: string;
    let riskLevel: RiskLevel | null = null;

    try {
      const response = await fetch('https://api.minimax.chat/v1/text/chatcompletion_v2', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'MiniMax-Text-01',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          max_tokens: 1024,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`MiniMax API error: ${response.status} - ${errText}`);
      }

      const data = await response.json() as { choices?: { message?: { content?: string } }[] };
      aiResult = data.choices?.[0]?.message?.content ?? 'AI 选股服务暂时无法返回结果，请稍后重试。';
      riskLevel = this.extractRiskLevel(aiResult);
    } catch {
      aiResult = 'AI 选股服务暂时不可用，请稍后重试。';
    }

    return {
      result: aiResult,
      riskLevel,
      riskLabel: riskLevel ? RISK_LABELS[riskLevel] : null,
    };
  }

  async saveScreen(
    userId: string,
    dto: CreateScreenDto,
    results: StockWithQuote[],
    aiRecommendation?: string,
    riskLevel?: string,
  ) {
    const stockRecords = await this.prismaService.stock.findMany({
      where: {
        code: { in: results.map((r) => r.code) },
      },
    });

    const stockIdMap = new Map(stockRecords.map((s) => [s.code, s.id]));

    const screen = await this.prismaService.stockScreen.create({
      data: {
        userId,
        title: dto.title,
        description: dto.description,
        criteria: dto.criteria as unknown as Prisma.InputJsonValue,
        aiRecommendation,
        riskLevel,
        results: {
          create: results
            .map((r, idx) => {
              const stockId = stockIdMap.get(r.code);
              if (!stockId) return null;
              return {
                stockId,
                rank: idx + 1,
              };
            })
            .filter((r): r is NonNullable<typeof r> => r !== null),
        },
      },
    });

    return screen;
  }

  async getHistory(userId: string, take = 20) {
    const screens = await this.prismaService.stockScreen.findMany({
      where: { userId },
      take,
      orderBy: { createdAt: 'desc' },
      include: {
        results: {
          take: 5,
          orderBy: { rank: 'asc' },
          include: { stock: true },
        },
      },
    });

    return screens.map((s) => ({
      id: s.id,
      title: s.title,
      description: s.description,
      criteria: s.criteria,
      aiRecommendation: s.aiRecommendation,
      riskLevel: s.riskLevel,
      createdAt: s.createdAt,
      topStocks: s.results.map((r: { stock: { code: string; name: string }; rank: number }) => ({
        code: r.stock.code,
        name: r.stock.name,
        rank: r.rank,
      })),
    }));
  }

  async getById(userId: string, screenId: string) {
    const screen = await this.prismaService.stockScreen.findFirst({
      where: { id: screenId, userId },
      include: {
        results: {
          orderBy: { rank: 'asc' },
          include: { stock: true },
        },
      },
    });

    if (!screen) return null;

    const codes = screen.results.map((r: { stock: { market: string; code: string } }) => `${r.stock.market}${r.stock.code}`);
    const quotes = await this.stocksService.getBatchQuotes(codes);

    return {
      id: screen.id,
      title: screen.title,
      description: screen.description,
      criteria: screen.criteria,
      aiRecommendation: screen.aiRecommendation,
      riskLevel: screen.riskLevel,
      createdAt: screen.createdAt,
      stocks: screen.results.map((r: { stock: { code: string; market: string; name?: string }; rank: number; score?: number }) => {
        const quote = quotes.find(
          (q) =>
            q.code === r.stock.code ||
            q.code === `${r.stock.market}${r.stock.code}`,
        );
        return {
          code: r.stock.code,
          name: r.stock.name,
          market: r.stock.market,
          rank: r.rank,
          latestPrice: quote?.price,
          priceChange: quote?.change,
          priceChangePct: quote?.changePercent,
          turnoverRate: quote?.turnover,
          marketCap: quote?.circulateCap,
          netInflow: quote?.netInflow,
        };
      }),
    };
  }

  private extractRiskLevel(text: string): RiskLevel | null {
    const upper = text.toUpperCase();
    if (upper.includes('风险大于收益')) return 'risk_high';
    if (upper.includes('收益大于风险')) return 'profit_high';
    if (upper.includes('可买可不买')) return 'neutral';
    if (upper.includes('不建议关注')) return 'avoid';
    return null;
  }
}
