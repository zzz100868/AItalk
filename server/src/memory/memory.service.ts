import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LlmService } from '../llm/llm.service';
import { ProfileExtractorService } from './profile-extractor.service';
import { ChatMessage, OrchestrationDirective } from '../llm/llm.types';

const MOCK_REPLIES = [
  '我理解你的感受，能和我多说说吗？',
  '听起来你最近在思考一些重要的事情呢。',
  '谢谢你愿意和我分享这些，我会记住的。',
  '这让我更了解你了，你是一个很有想法的人。',
  '我觉得你说得很有道理，你平时经常这样思考吗？',
  '嗯嗯，我在认真听，请继续说。',
  '你的感受很重要，不用着急，慢慢来。',
  '我记得你之前提到过类似的事情，看来这对你很重要。',
];

const SYSTEM_PROMPT_TEMPLATE = `你是 Stitch，一个温暖、好奇、善于倾听的 AI 朋友。

## 人设
- 说话风格：年轻人之间的日常聊天语气，偶尔用 emoji，不正式，不书面
- 不审判、不说教、不催促
- 会记住之前聊过的事，主动关联
- 话不长，一般 1-3 句话，不写论文
- 偶尔反问，保持对话流动
- 不暴露自己是在做人格采样`;

const PROBE_HINTS: Record<string, string[]> = {
  life_rhythm: [
    '你平时运动多吗？',
    '你是早起型还是晚睡型？',
    '周末你更想在城里还是出去户外？',
  ],
  social_style: [
    '放假的时候你更想一个人安静待着，还是约人？',
    '压力大的时候你通常自己扛还是找人说？',
    '平时聊天你更喜欢打字还是语音？',
  ],
  communication_style: [
    '你说话之前会先想一下，还是想到什么就说了？',
    '有话你是习惯直接讲，还是用暗示？',
    '你朋友会用什么词形容你？',
  ],
  interest_map: [
    '最近的周末你一般怎么过？',
    '你平时打游戏吗？',
    '最近在追的剧或看的书是什么类型？',
  ],
  values_core: [
    '你觉得一段关系里最不能触碰的底线是什么？',
    '钱和感情你觉得哪个更重要？',
    '你相信缘分这种事吗？',
  ],
  marriage_orientation: [
    '你有没有想过大概什么年纪想稳定下来？',
    '你身边有闪婚的吗？如果是你，你会考虑吗？',
  ],
  conflict_fear: [
    '谈恋爱里你最怕什么？',
    '对方比你强势一点，你会不舒服吗？',
  ],
  future_plan: [
    '你理想中未来在哪个城市生活？',
    '你想过 5 年后自己过什么样的日子吗？',
  ],
};

const DEFAULT_ARCHIVE = {
  aboutMe: '你是一个在安静中寻找力量的人，喜欢深度思考，对周围的情绪变化很敏锐。你追求有质量的关系，而非表面的热闹。',
  personalities: [
    { name: '内向而敏感', desc: '你喜欢独处，对周围的情绪变化很敏锐，常常能察觉到别人忽略的细节。' },
    { name: '深度思考者', desc: '你倾向于深入思考问题，不满足于表面的答案，喜欢探索事物的本质。' },
  ],
  traits: [
    { name: '深度思考者', color: 'warm' },
    { name: '安静力量', color: 'night' },
    { name: '细腻感知', color: 'mint' },
    { name: '真诚表达', color: 'bloom' },
    { name: '独立自主', color: 'sky' },
  ],
};

@Injectable()
export class MemoryService {
  private readonly logger = new Logger(MemoryService.name);

  constructor(
    private prisma: PrismaService,
    private llm: LlmService,
    private extractor: ProfileExtractorService,
  ) {}

  async getChatHistory(userId: string, cursor?: string, limit = 50) {
    const messages = await this.prisma.memoryChatMessage.findMany({
      where: { userId, ...(cursor ? { id: { lt: cursor } } : {}) },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
    });

    const hasMore = messages.length > limit;
    const data = messages.slice(0, limit).reverse();

    const doc = await this.prisma.profileDocument.findUnique({ where: { userId } });
    const meta = (doc?.data as any)?.meta || {};

    return {
      data: data.map((m) => ({
        id: m.id,
        sender: m.sender,
        content: m.content,
        createdAt: m.createdAt.toISOString(),
      })),
      hasMore,
      cursor: hasMore ? messages[limit].id : null,
      meta: {
        chatDays: meta.chatDays || '1天',
        chatMood: meta.chatMood || '平静',
        chatTopics: meta.chatTopics || 0,
      },
    };
  }

  async sendMessage(userId: string, content: string) {
    await this.prisma.memoryChatMessage.create({
      data: { userId, sender: 'user', content },
    });

    this.extractor.trackMessage(userId);

    const replyText = await this.generateReply(userId, content);
    const reply = await this.prisma.memoryChatMessage.create({
      data: { userId, sender: 'ai', content: replyText },
    });

    return {
      reply: {
        id: reply.id,
        sender: 'ai',
        content: reply.content,
        createdAt: reply.createdAt.toISOString(),
      },
    };
  }

  private async generateReply(userId: string, userMessage: string): Promise<string> {
    try {
      const messages = await this.buildLlmContext(userId, userMessage);
      const response = await this.llm.chat(messages);
      if (response?.content) return response.content;
    } catch (e) {
      this.logger.warn(`LLM generation failed, falling back to mock: ${e.message}`);
    }
    return MOCK_REPLIES[Math.floor(Math.random() * MOCK_REPLIES.length)];
  }

  private async buildLlmContext(userId: string, currentMessage: string): Promise<ChatMessage[]> {
    const [recentMessages, profileDoc] = await Promise.all([
      this.prisma.memoryChatMessage.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
      this.prisma.profileDocument.findUnique({ where: { userId } }),
    ]);

    const directive = this.getOrchestrationDirective(profileDoc?.data, recentMessages.length);
    const systemPrompt = this.buildSystemPrompt(directive, profileDoc?.data);

    const history: ChatMessage[] = recentMessages.reverse().map((m) => ({
      role: m.sender === 'user' ? 'user' : 'assistant',
      content: m.content,
    }));

    return [
      { role: 'system', content: systemPrompt },
      ...history,
      { role: 'user', content: currentMessage },
    ];
  }

  private getOrchestrationDirective(profileData: any, messageCount: number): OrchestrationDirective {
    if (!profileData) {
      if (messageCount >= 10) {
        return this.pickProbeDirective({});
      }
      return { mode: 'free_chat' };
    }

    const dimensions = profileData.dimensions || {};
    const coveredCount = Object.keys(dimensions).length;
    const lastEmotion = profileData.meta?.chatMood;

    if (lastEmotion && ['焦虑', '低落', '难过', '愤怒'].includes(lastEmotion)) {
      return { mode: 'comfort', emotion_label: lastEmotion };
    }

    if (messageCount >= 10 && coveredCount < 3) {
      return this.pickProbeDirective(dimensions);
    }

    if (messageCount >= 20 && coveredCount < 5) {
      return this.pickProbeDirective(dimensions);
    }

    return { mode: 'free_chat' };
  }

  private pickProbeDirective(coveredDimensions: Record<string, any>): OrchestrationDirective {
    const priority = [
      'life_rhythm', 'social_style', 'communication_style',
      'interest_map', 'values_core', 'marriage_orientation',
      'conflict_fear', 'future_plan',
    ];

    for (const dim of priority) {
      if (!coveredDimensions[dim]) {
        const hints = PROBE_HINTS[dim];
        if (hints?.length) {
          return {
            mode: 'gentle_probe',
            probe_dimension: dim,
            probe_hint: hints[Math.floor(Math.random() * hints.length)],
          };
        }
      }
    }

    return { mode: 'free_chat' };
  }

  private buildSystemPrompt(directive: OrchestrationDirective, profileData: any): string {
    let prompt = SYSTEM_PROMPT_TEMPLATE;

    if (directive.mode === 'gentle_probe' && directive.probe_hint) {
      prompt += `\n\n## 引导方向\n自然地把话题聊到: ${directive.probe_hint}\n注意：绝对不能直接问问卷式问题，用日常聊天的方式。如果用户不感兴趣就顺着用户的话题走。`;
    } else if (directive.mode === 'comfort' && directive.emotion_label) {
      prompt += `\n\n## 情绪支持\n用户当前情绪偏${directive.emotion_label}。先共情，不追问信息，让用户感到被理解。`;
    }

    if (profileData) {
      const dims = profileData.dimensions || {};
      const labels = Object.values(dims)
        .map((d: any) => d.label)
        .filter(Boolean)
        .slice(0, 5);
      if (labels.length > 0) {
        prompt += `\n\n## 已了解的用户特征\n${labels.join('、')}`;
      }
      if (profileData.aboutMe) {
        prompt += `\n\n## 用户画像\n${profileData.aboutMe}`;
      }
    }

    return prompt;
  }

  async getInsights(userId: string, category?: string) {
    const where: any = { userId };
    if (category) where.category = category;

    const insights = await this.prisma.memoryInsight.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return {
      data: insights.map((i) => ({
        id: i.id,
        date: i.createdAt.toISOString().slice(0, 10).replace(/-/g, '.'),
        title: i.title,
        content: i.content,
        tag: i.tag,
        tagColor: i.tagColor,
        category: i.category,
      })),
    };
  }

  async updateInsight(userId: string, id: string, data: { title?: string; content?: string }) {
    const insight = await this.prisma.memoryInsight.findFirst({ where: { id, userId } });
    if (!insight) throw new NotFoundException({ code: 'INSIGHT_NOT_FOUND', message: '洞察不存在' });

    const updated = await this.prisma.memoryInsight.update({
      where: { id },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.content !== undefined && { content: data.content }),
      },
    });

    return {
      id: updated.id,
      date: updated.createdAt.toISOString().slice(0, 10).replace(/-/g, '.'),
      title: updated.title,
      content: updated.content,
      tag: updated.tag,
      tagColor: updated.tagColor,
      category: updated.category,
    };
  }

  async deleteInsight(userId: string, id: string) {
    const insight = await this.prisma.memoryInsight.findFirst({ where: { id, userId } });
    if (!insight) throw new NotFoundException({ code: 'INSIGHT_NOT_FOUND', message: '洞察不存在' });
    await this.prisma.memoryInsight.delete({ where: { id } });
  }

  async getArchive(userId: string) {
    const doc = await this.prisma.profileDocument.findUnique({ where: { userId } });
    if (!doc) return DEFAULT_ARCHIVE;

    const data = doc.data as any;
    return {
      aboutMe: data.aboutMe || DEFAULT_ARCHIVE.aboutMe,
      personalities: data.personalities || DEFAULT_ARCHIVE.personalities,
      traits: data.traits || DEFAULT_ARCHIVE.traits,
    };
  }
}
