import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LlmService } from '../llm/llm.service';
import { ChatMessage } from '../llm/llm.types';
import { MatchCandidate, MatchCopyResult, ProfileData } from './match.types';
import { greedyPairing, isColdStart } from './matching.engine';

const MATCH_COPY_PROMPT = `你是赛博聊机的匹配文案师。根据两位用户的画像，写出：
1. 一段匹配理由（2-3 句，要有"故事感"，引用双方的具体偏好或经历）
2. 两条破冰话题（自然、有趣、能引发对话）
3. 一段匹配洞察（1-2句，揭示两人深层共鸣点）

## 输出格式（严格 JSON）
{"reason": "...", "icebreakers": ["...", "..."], "insight": "..."}`;

const HIGH_WEIGHT_DIMS = [
  'marriage_orientation',
  'family_model',
  'values_core',
  'conflict_fear',
  'communication_style',
];

@Injectable()
export class MatchService {
  private readonly logger = new Logger(MatchService.name);

  constructor(
    private prisma: PrismaService,
    private llm: LlmService,
  ) {}

  // ============ Public API ============

  async getCurrentMatch(userId: string) {
    const now = new Date();
    const isOpen = now.getDay() === 2;
    const weekStart = this.getWeekStart(now);

    const result = await this.prisma.matchResult.findFirst({
      where: {
        OR: [{ userAId: userId }, { userBId: userId }],
        round: { scheduledAt: { gte: weekStart } },
      },
      include: { userA: true, userB: true },
    });

    if (result) {
      const other = result.userAId === userId ? result.userB : result.userA;
      const unlocked = result.userAId === userId ? result.unlockedByA : result.unlockedByB;
      return {
        isOpen: true,
        hasResult: true,
        match: {
          id: result.id,
          avatar: other.avatar,
          name: other.nickname,
          bio: other.bio,
          compatibility: result.score,
          tags: await this.getTopTags(other.id),
          icebreakers: result.icebreakers as string[],
          insight: result.insightText,
          unlocked,
        },
        nextOpenAt: null,
      };
    }

    if (!isOpen) {
      return {
        isOpen: false,
        hasResult: false,
        match: null,
        nextOpenAt: this.getNextTuesday(now).toISOString(),
      };
    }

    return { isOpen: true, hasResult: false, match: null, nextOpenAt: null };
  }

  async doMatch(userId: string) {
    const now = new Date();
    const weekStart = this.getWeekStart(now);

    const existing = await this.prisma.matchResult.findFirst({
      where: {
        OR: [{ userAId: userId }, { userBId: userId }],
        round: { scheduledAt: { gte: weekStart } },
      },
      include: { userA: true, userB: true },
    });

    if (existing) {
      const other = existing.userAId === userId ? existing.userB : existing.userA;
      return {
        success: true,
        match: {
          id: existing.id,
          avatar: other.avatar,
          name: other.nickname,
          bio: other.bio,
          compatibility: existing.score,
          tags: await this.getTopTags(other.id),
          icebreakers: existing.icebreakers as string[],
          insight: existing.insightText,
          unlocked: existing.userAId === userId ? existing.unlockedByA : existing.unlockedByB,
        },
      };
    }

    return { success: false, match: null, message: '本周匹配尚未生成，请等待周二匹配开放' };
  }

  async submitFeedback(
    userId: string,
    matchId: string,
    data: { sentiment: string; skipReason?: string; comments?: string },
  ) {
    await this.prisma.matchFeedback.create({
      data: {
        matchId,
        userId,
        sentiment: data.sentiment,
        skipReason: data.skipReason,
        comments: data.comments,
      },
    });

    if (data.sentiment === 'negative' && data.skipReason) {
      setTimeout(() => this.adjustProfileFromFeedback(userId, matchId, data.skipReason!), 500);
    }
  }

  // ============ Match Round Execution (called by scheduler) ============

  async executeMatchRound(): Promise<void> {
    this.logger.log('Starting weekly match round...');

    const round = await this.prisma.matchRound.create({
      data: { scheduledAt: new Date(), status: 'generating' },
    });

    try {
      const candidates = await this.buildCandidatePool();
      if (candidates.length < 2) {
        this.logger.warn('Not enough candidates for matching');
        await this.prisma.matchRound.update({ where: { id: round.id }, data: { status: 'published' } });
        return;
      }

      const coldStart = isColdStart(candidates.length);
      const recentPairs = await this.getRecentMatchPairs();
      const pairs = greedyPairing(candidates, recentPairs, coldStart);

      this.logger.log(`Generated ${pairs.length} match pairs (coldStart=${coldStart})`);

      for (const pair of pairs) {
        const copy = await this.generateMatchCopy(pair.userA, pair.userB, pair.score);

        await this.prisma.matchResult.create({
          data: {
            roundId: round.id,
            userAId: pair.userA.userId,
            userBId: pair.userB.userId,
            score: pair.score,
            reasonText: copy.reason,
            icebreakers: copy.icebreakers,
            insightText: copy.insight,
          },
        });
      }

      await this.prisma.matchRound.update({ where: { id: round.id }, data: { status: 'published' } });
      this.logger.log(`Match round ${round.id} published with ${pairs.length} pairs`);
    } catch (e) {
      this.logger.error(`Match round failed: ${e.message}`);
      await this.prisma.matchRound.update({ where: { id: round.id }, data: { status: 'pending' } });
    }
  }

  // ============ Private helpers ============

  private async buildCandidatePool(): Promise<MatchCandidate[]> {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const users = await this.prisma.user.findMany({
      where: {
        updatedAt: { gte: sevenDaysAgo },
      },
      include: { profileDoc: true },
    });

    const candidates: MatchCandidate[] = [];

    for (const user of users) {
      const profileData = (user.profileDoc?.data as any) as ProfileData | null;
      if (!profileData?.dimensions) continue;

      const confidenceOk = this.checkDimensionConfidence(profileData, isColdStart(users.length));
      if (!confidenceOk) continue;

      const activity = await this.computeActivityScore(user.id, sevenDaysAgo);

      candidates.push({
        userId: user.id,
        gender: user.gender,
        city: user.city,
        birthYear: user.birthYear,
        orientation: user.orientation,
        nickname: user.nickname,
        avatar: user.avatar,
        bio: user.bio,
        profile: profileData,
        activityScore: activity,
      });
    }

    return candidates;
  }

  private checkDimensionConfidence(profile: ProfileData, coldStart: boolean): boolean {
    const threshold = coldStart ? 0.2 : 0.4;
    let passCount = 0;

    for (const dimId of HIGH_WEIGHT_DIMS) {
      const dim = profile.dimensions[dimId];
      if (dim && dim.confidence >= threshold) passCount++;
    }

    return passCount >= 3;
  }

  private async computeActivityScore(userId: string, since: Date): Promise<number> {
    const [voiceSessions, chatMessages] = await Promise.all([
      this.prisma.voiceSession.count({ where: { userId, startedAt: { gte: since } } }),
      this.prisma.memoryChatMessage.count({ where: { userId, createdAt: { gte: since } } }),
    ]);

    const raw = 0.5 * Math.min(voiceSessions, 10) / 10 +
                0.5 * Math.min(chatMessages, 50) / 50;
    return Math.min(1, raw);
  }

  private async getRecentMatchPairs(): Promise<Set<string>> {
    const fourWeeksAgo = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000);
    const results = await this.prisma.matchResult.findMany({
      where: { round: { scheduledAt: { gte: fourWeeksAgo } } },
      select: { userAId: true, userBId: true },
    });

    const pairs = new Set<string>();
    for (const r of results) {
      pairs.add([r.userAId, r.userBId].sort().join(':'));
    }
    return pairs;
  }

  private async generateMatchCopy(
    a: MatchCandidate,
    b: MatchCandidate,
    score: number,
  ): Promise<MatchCopyResult> {
    const aSummary = this.buildProfileSummary(a);
    const bSummary = this.buildProfileSummary(b);
    const topDims = this.getTopMatchedDimensions(a, b);

    const messages: ChatMessage[] = [
      { role: 'system', content: MATCH_COPY_PROMPT },
      {
        role: 'user',
        content: `## 用户 A 画像\n${aSummary}\n\n## 用户 B 画像\n${bSummary}\n\n## 匹配核心维度\n${topDims}\n\n## 匹配分数\n${score}/100`,
      },
    ];

    const result = await this.llm.chatWithJson(messages);

    if (result?.reason && result?.icebreakers && result?.insight) {
      return {
        reason: result.reason,
        icebreakers: Array.isArray(result.icebreakers) ? result.icebreakers.slice(0, 2) : [],
        insight: result.insight,
      };
    }

    return this.fallbackCopy(a, b, score);
  }

  private buildProfileSummary(c: MatchCandidate): string {
    const parts: string[] = [`昵称: ${c.nickname}`, `简介: ${c.bio || '未填写'}`];

    for (const [dimId, dim] of Object.entries(c.profile.dimensions)) {
      if (dim.confidence >= 0.3) {
        parts.push(`${dimId}: ${dim.label} (置信度 ${dim.confidence.toFixed(1)})`);
      }
    }

    if (c.profile.traits?.length) {
      parts.push(`特质: ${c.profile.traits.join(', ')}`);
    }

    return parts.join('\n');
  }

  private getTopMatchedDimensions(a: MatchCandidate, b: MatchCandidate): string {
    const dims: { id: string; score: number }[] = [];

    for (const [dimId, aDim] of Object.entries(a.profile.dimensions)) {
      const bDim = b.profile.dimensions[dimId];
      if (!bDim) continue;
      const similarity = 1 - Math.abs(aDim.score - bDim.score);
      dims.push({ id: dimId, score: similarity });
    }

    return dims
      .sort((x, y) => y.score - x.score)
      .slice(0, 3)
      .map(d => `${d.id}: 相似度 ${(d.score * 100).toFixed(0)}%`)
      .join('\n');
  }

  private fallbackCopy(a: MatchCandidate, b: MatchCandidate, score: number): MatchCopyResult {
    const sharedDims = Object.keys(a.profile.dimensions)
      .filter(k => b.profile.dimensions[k])
      .length;

    return {
      reason: `你们在 ${sharedDims} 个维度上有共鸣，匹配度 ${score}%。`,
      icebreakers: [
        '最近有什么让你觉得开心的事情吗？',
        '你平时周末一般怎么度过？',
      ],
      insight: '你们都在寻找真诚的连接，这是最好的开始。',
    };
  }

  private async getTopTags(userId: string): Promise<string[]> {
    const doc = await this.prisma.profileDocument.findUnique({ where: { userId } });
    if (!doc) return [];

    const data = doc.data as any as ProfileData;
    if (!data?.dimensions) return [];

    return Object.values(data.dimensions)
      .filter(d => d.confidence >= 0.3)
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 3)
      .map(d => d.label);
  }

  private async adjustProfileFromFeedback(userId: string, matchId: string, reason: string) {
    try {
      const match = await this.prisma.matchResult.findUnique({
        where: { id: matchId },
        include: { userA: { include: { profileDoc: true } }, userB: { include: { profileDoc: true } } },
      });

      if (!match) return;

      const otherId = match.userAId === userId ? match.userBId : match.userAId;
      const otherDoc = match.userAId === userId ? match.userB.profileDoc : match.userA.profileDoc;
      if (!otherDoc) return;

      const myDoc = await this.prisma.profileDocument.findUnique({ where: { userId } });
      if (!myDoc) return;

      const myData = myDoc.data as any as ProfileData;
      if (!myData?.dimensions) return;

      const dimToAdjust = this.inferDimensionFromReason(reason);
      if (dimToAdjust && myData.dimensions[dimToAdjust]) {
        myData.dimensions[dimToAdjust].confidence = Math.max(
          0.1,
          myData.dimensions[dimToAdjust].confidence - 0.05,
        );

        await this.prisma.profileDocument.update({
          where: { userId },
          data: { data: myData as any, version: myDoc.version + 1 },
        });
      }
    } catch (e) {
      this.logger.error(`Feedback adjustment failed: ${e.message}`);
    }
  }

  private inferDimensionFromReason(reason: string): string | null {
    const mapping: Record<string, string> = {
      '性格不合': 'communication_style',
      '三观不同': 'values_core',
      '兴趣不同': 'interest_map',
      '生活节奏不同': 'life_rhythm',
      '距离太远': 'social_style',
      '目标不同': 'marriage_orientation',
    };
    return mapping[reason] || null;
  }

  private getWeekStart(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  private getNextTuesday(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const daysUntilTuesday = (2 - day + 7) % 7 || 7;
    d.setDate(d.getDate() + daysUntilTuesday);
    d.setHours(0, 0, 0, 0);
    return d;
  }
}
