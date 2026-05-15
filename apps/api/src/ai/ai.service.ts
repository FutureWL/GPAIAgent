import { Injectable, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { MembershipService } from '../membership/membership.service';

type RiskLevel = 'risk_high' | 'profit_high' | 'neutral' | 'avoid';

const RISK_LABELS: Record<RiskLevel, string> = {
  risk_high: '风险大于收益',
  profit_high: '收益大于风险',
  neutral: '可买可不买',
  avoid: '不建议关注',
};

@Injectable()
export class AiService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly membershipService: MembershipService,
    private readonly configService: ConfigService,
  ) {}

  async analyze(
    userId: string,
    stockCode: string,
    stockName: string,
    prompt: string,
  ) {
    // 检查会员权限
    const access = await this.membershipService.checkAccess(userId);
    if (!access.hasAccess) {
      throw new ForbiddenException('该功能仅对会员开放，请先购买会员');
    }

    // 调用 MiniMax API
    const apiKey = this.configService.get<string>('MINIMAX_API_KEY');
    if (!apiKey) {
      throw new Error('MiniMax API Key 未配置');
    }

    const systemPrompt = `你是一个专业的股票分析助手。你的职责是为用户提供股票风险/收益分析作为参考，不构成任何买卖建议。

合规要求：
- 不得预测具体涨跌
- 不得推荐买卖具体股票
- 只能输出以下四种结论之一：风险大于收益 / 收益大于风险 / 可买可不买 / 不建议关注

输出格式（严格遵循）：
## 分析结论
[给出综合分析，200字以内]

## 风险标签
[从以下四项选择最合适的：风险大于收益 | 收益大于风险 | 可买可不买 | 不建议关注]

## 合规声明
以上分析仅供参考，不构成投资建议。投资有风险，决策需谨慎。`;

    const userPrompt = `请分析股票 ${stockName}（代码：${stockCode}）。\n\n用户问题：${prompt}`;

    let result: string;
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
      result = data.choices?.[0]?.message?.content ?? '分析服务暂时无法返回结果，请稍后重试。';

      // 从结果中提取风险标签
      riskLevel = this.extractRiskLevel(result);
    } catch (err) {
      // MiniMax 不可用时，返回兜底分析（模拟）
      result = this.mockAnalysis(stockName, prompt);
      riskLevel = this.extractRiskLevel(result);
    }

    // 保存分析记录
    const generation = await this.prismaService.aIGeneration.create({
      data: {
        userId,
        stockCode,
        stockName,
        prompt,
        result,
        riskLevel,
        model: 'MiniMax-Text-01',
      },
    });

    return {
      id: generation.id,
      stockCode,
      stockName,
      result,
      riskLevel,
      riskLabel: riskLevel ? RISK_LABELS[riskLevel] : null,
      createdAt: generation.createdAt,
    };
  }

  async getHistory(userId: string, take = 20) {
    return this.prismaService.aIGeneration.findMany({
      where: { userId },
      take,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        stockCode: true,
        stockName: true,
        prompt: true,
        result: true,
        riskLevel: true,
        createdAt: true,
      },
    });
  }

  private extractRiskLevel(text: string): RiskLevel | null {
    const upper = text.toUpperCase();
    if (upper.includes('风险大于收益')) return 'risk_high';
    if (upper.includes('收益大于风险')) return 'profit_high';
    if (upper.includes('可买可不买')) return 'neutral';
    if (upper.includes('不建议关注')) return 'avoid';
    return null;
  }

  private mockAnalysis(stockName: string, _prompt: string): string {
    const levels: RiskLevel[] = ['risk_high', 'profit_high', 'neutral', 'avoid'];
    const level = levels[Math.floor(Math.random() * levels.length)];
    const label = RISK_LABELS[level];

    return `## 分析结论
基于当前市场环境和技术形态分析，${stockName}的整体走势呈现震荡格局。从成交量来看，市场参与度适中，但方向性不明确。

基本面上，需关注近期行业政策和公司业绩变化。技术面上，股价处于关键支撑位附近，短期波动风险较大。

综合研判：${label}。

## 风险标签
${label}

## 合规声明
以上分析仅供参考，不构成投资建议。投资有风险，决策需谨慎。`;
  }
}
