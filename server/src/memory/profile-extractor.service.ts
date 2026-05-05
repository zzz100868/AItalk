import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LlmService } from '../llm/llm.service';
import { ChatMessage, ExtractionResult } from '../llm/llm.types';

const EXTRACTION_PROMPT = `你是一个用户画像分析器。根据以下对话片段，抽取用户的人格特征证据。

## 可识别的维度 ID
- marriage_orientation: 婚恋取向
- family_model: 家庭模式
- values_core: 核心价值观
- life_rhythm: 生活节奏
- social_style: 社交风格
- communication_style: 沟通风格
- conflict_fear: 关系恐惧
- interest_map: 兴趣图谱
- future_plan: 未来规划
- social_stance: 社会态度

## 输出格式 (JSON)
{
  "evidence": [
    {
      "dimension": "维度ID",
      "label": "中文标签 (如 '夜猫子', '喜欢独处')",
      "text": "用户原话中的证据片段",
      "confidence": 0.1到0.3之间的数值
    }
  ],
  "emotion_summary": "本段对话用户的整体情绪 (如 平静/开心/焦虑/低落)",
  "topics": ["讨论过的话题关键词"]
}

## 规则
- 只从用户(user)的发言中抽取，不要从AI的回复中抽取
- 如果对话中没有明确的人格信息，返回空 evidence 数组
- 不要过度推测，只抽取有明确文本支持的特征
- confidence 根据用户表达的确定程度给分：模糊表达 0.1，明确表达 0.2，反复强调 0.3`;

const INSIGHT_PROMPT = `根据以下用户画像证据，生成一条简短的洞察卡片。

## 输出格式 (JSON)
{
  "title": "4-8个字的标题",
  "content": "1-2句话的洞察描述",
  "category": "life 或 emotion 或 hobby 或 growth",
  "tag": "生活 或 情绪 或 兴趣 或 成长"
}

## 维度到分类映射
- life_rhythm, family_model → life/生活
- social_style, communication_style, conflict_fear → emotion/情绪
- interest_map → hobby/兴趣
- marriage_orientation, values_core, future_plan, social_stance → growth/成长`;

const TAG_COLOR_MAP: Record<string, string> = {
  life: 'secondary',
  emotion: 'tertiary',
  hobby: 'primary',
  growth: 'primary',
};

@Injectable()
export class ProfileExtractorService {
  private readonly logger = new Logger(ProfileExtractorService.name);
  private pendingExtractions = new Map<string, number>();

  constructor(
    private prisma: PrismaService,
    private llm: LlmService,
  ) {}

  trackMessage(userId: string) {
    const count = (this.pendingExtractions.get(userId) || 0) + 1;
    this.pendingExtractions.set(userId, count);

    if (count >= 5) {
      this.pendingExtractions.set(userId, 0);
      setTimeout(() => this.extractProfile(userId), 1000);
    }
  }

  private async extractProfile(userId: string) {
    try {
      const recentMessages = await this.prisma.memoryChatMessage.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 10,
      });

      if (recentMessages.length < 5) return;

      const conversationText = recentMessages
        .reverse()
        .map((m) => `${m.sender === 'user' ? '用户' : 'AI'}: ${m.content}`)
        .join('\n');

      const messages: ChatMessage[] = [
        { role: 'system', content: EXTRACTION_PROMPT },
        { role: 'user', content: `## 对话片段\n${conversationText}` },
      ];

      const result: ExtractionResult | null = await this.llm.chatWithJson(messages);
      if (!result || !result.evidence?.length) {
        this.logger.debug(`No evidence extracted for user ${userId}`);
        return;
      }

      await this.mergeProfileEvidence(userId, result);
      this.logger.log(`Extracted ${result.evidence.length} evidence(s) for user ${userId}`);
    } catch (e) {
      this.logger.error(`Profile extraction failed for ${userId}: ${e.message}`);
    }
  }

  private async mergeProfileEvidence(userId: string, result: ExtractionResult) {
    const existing = await this.prisma.profileDocument.findUnique({ where: { userId } });
    const data: any = existing?.data || { dimensions: {}, aboutMe: '', personalities: [], traits: [] };

    if (!data.dimensions) data.dimensions = {};

    let newDimensionCovered = false;
    let firstNewEvidence: { dimension: string; label: string } | null = null;

    for (const ev of result.evidence) {
      if (!data.dimensions[ev.dimension]) {
        data.dimensions[ev.dimension] = {
          label: ev.label,
          score: 0,
          confidence: 0,
          evidence: [],
        };
        newDimensionCovered = true;
        if (!firstNewEvidence) firstNewEvidence = ev;
      }

      const dim = data.dimensions[ev.dimension];
      dim.evidence.push({
        text: ev.text,
        confidence_delta: ev.confidence,
        timestamp: new Date().toISOString(),
      });
      dim.confidence = Math.min(1.0, dim.confidence + ev.confidence);
      dim.label = ev.label;
    }

    if (result.emotion_summary) {
      data.meta = data.meta || {};
      data.meta.chatMood = result.emotion_summary;
    }
    if (result.topics?.length) {
      data.meta = data.meta || {};
      data.meta.chatTopics = (data.meta.chatTopics || 0) + result.topics.length;
    }

    await this.prisma.profileDocument.upsert({
      where: { userId },
      create: { userId, data, version: 1 },
      update: { data, version: existing ? existing.version + 1 : 1 },
    });

    if (newDimensionCovered && firstNewEvidence) {
      await this.generateInsight(userId, firstNewEvidence);
    }
  }

  private async generateInsight(userId: string, evidence: { dimension: string; label: string }) {
    const messages: ChatMessage[] = [
      { role: 'system', content: INSIGHT_PROMPT },
      { role: 'user', content: `维度: ${evidence.dimension}\n标签: ${evidence.label}` },
    ];

    const result = await this.llm.chatWithJson(messages);
    if (!result?.title || !result?.content) return;

    const category = result.category || 'growth';
    await this.prisma.memoryInsight.create({
      data: {
        userId,
        title: result.title,
        content: result.content,
        category,
        tag: result.tag || '成长',
        tagColor: TAG_COLOR_MAP[category] || 'primary',
      },
    });
  }
}
