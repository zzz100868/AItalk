import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const MOCK_CANDIDATES = [
  {
    id: 'mock_match_1',
    avatar: '/images/avatar-default.png',
    name: '林小溪',
    bio: '喜欢在清晨喝手冲咖啡的设计师',
    compatibility: 96,
    tags: ['手冲咖啡', '极简设计', '晨型人'],
    icebreakers: [
      '看到你也喜欢在清晨喝手冲咖啡，有什么推荐的豆子吗？',
      '你的主页有一种很安静的力量，周末通常怎么度过？',
    ],
    insight: '你们同样偏好安静的周末与深度的自我对话，这种对「留白」的共同追求，为建立无压力的灵魂连接提供了土壤。',
    unlocked: false,
  },
  {
    id: 'mock_match_2',
    avatar: '/images/avatar-default.png',
    name: '陈默',
    bio: '写代码也写诗的产品经理',
    compatibility: 92,
    tags: ['写作', '独处', '深度阅读'],
    icebreakers: [
      '听说你也喜欢在深夜写点东西，最近在写什么？',
      '你觉得一个好的产品和一首好诗有什么共同点？',
    ],
    insight: '你们都在理性与感性之间寻找平衡，这种双重气质让你们有可能成为既能聊工作又能聊灵魂的伙伴。',
    unlocked: false,
  },
  {
    id: 'mock_match_3',
    avatar: '/images/avatar-default.png',
    name: '周晚',
    bio: '在城市里寻找自然的插画师',
    compatibility: 89,
    tags: ['插画', '自然', '猫咪'],
    icebreakers: [
      '你画的那些城市里的植物好美，是在哪里发现它们的？',
      '你家的猫叫什么名字？它会陪你画画吗？',
    ],
    insight: '你们都在快节奏中寻找慢生活的可能性，这种共同的追求让你们的相处自带一种宁静的频率。',
    unlocked: false,
  },
];

@Injectable()
export class MatchService {
  constructor(private prisma: PrismaService) {}

  async getCurrentMatch(userId: string) {
    const now = new Date();
    const isOpen = now.getDay() === 2; // 周二

    // Phase 1: 尝试从 DB 取本周匹配结果
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
          tags: [],
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
    const isOpen = now.getDay() === 2;

    // Phase 1: TEST_MODE 始终开放，返回 mock 数据
    // 真实实现需检查: isOpen, 本周是否已匹配, 用户画像完整度
    if (!isOpen) {
      // Phase 1 宽松模式：不强制周二限制，方便开发调试
    }

    // 返回 mock 候选人
    const candidate = MOCK_CANDIDATES[Math.floor(Math.random() * MOCK_CANDIDATES.length)];

    return {
      success: true,
      match: candidate,
    };
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
