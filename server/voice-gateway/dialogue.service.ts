import { PrismaClient } from '@prisma/client';
import { CONFIG, isLlmConfigured } from './config';
import { OrchestrationDirective, DialogueTurnData } from './types';

const MOCK_REPLIES = [
  '嗨，今天过得怎么样？有什么想聊的吗？',
  '我理解你的感受，能和我多说说吗？',
  '听起来你最近在思考一些重要的事情呢。',
  '谢谢你愿意和我分享这些，我会记住的。',
  '这让我更了解你了，你是一个很有想法的人。',
  '嗯嗯，我在认真听，请继续说。',
  '你的感受很重要，不用着急，慢慢来。',
];

const XIAOYA_SYSTEM_PROMPT = `你是小雅，一个温柔、真诚、善于倾听的 AI 朋友。你们正在打电话聊天。

## 人设
- 说话像闺蜜/好朋友，不正式，不书面
- 因为是语音通话，回复简短（1-2句话），像真正在打电话聊天
- 不审判、不说教、不催促
- 会记住之前聊过的事
- 语气自然、温暖、偶尔俏皮
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
  ],
  communication_style: [
    '你说话之前会先想一下，还是想到什么就说了？',
    '有话你是习惯直接讲，还是用暗示？',
  ],
  interest_map: [
    '最近的周末你一般怎么过？',
    '你平时打游戏吗？',
    '最近在追的剧或看的书是什么类型？',
  ],
  values_core: [
    '你觉得一段关系里最不能触碰的底线是什么？',
    '钱和感情你觉得哪个更重要？',
  ],
  marriage_orientation: [
    '你有没有想过大概什么年纪想稳定下来？',
  ],
  conflict_fear: [
    '谈恋爱里你最怕什么？',
  ],
  future_plan: [
    '你理想中未来在哪个城市生活？',
  ],
};

const OPENING_LINES = [
  '嗨～今天过得怎么样呀？',
  '嘿，又来找我聊天啦，开心！今天有什么新鲜事吗？',
  '你好呀～最近怎么样？',
];

export class DialogueService {
  private prisma: PrismaClient;
  private turnCount = 0;
  private turns: DialogueTurnData[] = [];
  private sessionId: string | null = null;
  private userId: string;

  constructor(userId: string) {
    this.userId = userId;
    this.prisma = new PrismaClient();
  }

  async init(): Promise<string> {
    const session = await this.prisma.voiceSession.create({
      data: { userId: this.userId, status: 'ongoing' },
    });
    this.sessionId = session.id;
    return session.id;
  }

  getOpeningLine(): string {
    return OPENING_LINES[Math.floor(Math.random() * OPENING_LINES.length)];
  }

  async generateReply(userText: string): Promise<string> {
    this.turns.push({ role: 'user', text: userText });
    this.turnCount++;

    // Save user turn to DB
    if (this.sessionId) {
      await this.prisma.dialogueTurn.create({
        data: {
          sessionId: this.sessionId,
          idx: this.turns.length - 1,
          role: 'user',
          text: userText,
        },
      }).catch(() => {});
    }

    const reply = await this.callLlm(userText);

    this.turns.push({ role: 'ai', text: reply });

    // Save AI turn to DB
    if (this.sessionId) {
      await this.prisma.dialogueTurn.create({
        data: {
          sessionId: this.sessionId,
          idx: this.turns.length - 1,
          role: 'ai',
          text: reply,
        },
      }).catch(() => {});
    }

    // Trigger profile extraction every 5 turns
    if (this.turnCount % 5 === 0) {
      this.triggerProfileExtraction();
    }

    return reply;
  }

  async endSession(durationSec: number): Promise<void> {
    if (!this.sessionId) return;

    await this.prisma.voiceSession.update({
      where: { id: this.sessionId },
      data: {
        status: 'ended',
        endedAt: new Date(),
        durationSec,
      },
    }).catch(() => {});

    // Trigger final profile extraction
    this.triggerProfileExtraction();
    await this.prisma.$disconnect();
  }

  getTurnCount(): number {
    return this.turnCount;
  }

  // ============ Private Methods ============

  private async callLlm(userText: string): Promise<string> {
    if (!isLlmConfigured()) {
      return MOCK_REPLIES[Math.floor(Math.random() * MOCK_REPLIES.length)];
    }

    try {
      const profileDoc = await this.prisma.profileDocument.findUnique({
        where: { userId: this.userId },
      });

      const directive = this.getOrchestrationDirective(profileDoc?.data);
      const systemPrompt = this.buildSystemPrompt(directive, profileDoc?.data);

      const recentTurns = this.turns.slice(-10);
      const messages = [
        { role: 'system' as const, content: systemPrompt },
        ...recentTurns.map(t => ({
          role: (t.role === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
          content: t.text,
        })),
      ];

      const res = await fetch(`${CONFIG.volcLlmEndpoint}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${CONFIG.volcApiKey}`,
        },
        body: JSON.stringify({
          model: CONFIG.volcLlmModel,
          messages,
          temperature: 0.85,
          max_tokens: 256,
        }),
      });

      if (!res.ok) {
        console.error(`[Dialogue] LLM error ${res.status}`);
        return MOCK_REPLIES[Math.floor(Math.random() * MOCK_REPLIES.length)];
      }

      const data: any = await res.json();
      const content = data.choices?.[0]?.message?.content;
      return content || MOCK_REPLIES[Math.floor(Math.random() * MOCK_REPLIES.length)];
    } catch (e: any) {
      console.error(`[Dialogue] LLM failed: ${e.message}`);
      return MOCK_REPLIES[Math.floor(Math.random() * MOCK_REPLIES.length)];
    }
  }

  private getOrchestrationDirective(profileData: any): OrchestrationDirective {
    if (!profileData) {
      if (this.turnCount >= 5) {
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

    if (this.turnCount >= 5 && coveredCount < 3) {
      return this.pickProbeDirective(dimensions);
    }

    if (this.turnCount >= 10 && coveredCount < 5) {
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
    let prompt = XIAOYA_SYSTEM_PROMPT;

    if (directive.mode === 'gentle_probe' && directive.probe_hint) {
      prompt += `\n\n## 引导方向\n自然地把话题聊到: ${directive.probe_hint}\n注意：绝对不能直接问问卷式问题，用日常聊天的方式。如果对方不感兴趣就顺着话题走。`;
    } else if (directive.mode === 'comfort' && directive.emotion_label) {
      prompt += `\n\n## 情绪支持\n对方当前情绪偏${directive.emotion_label}。先共情，不追问信息，让对方感到被理解。`;
    }

    if (profileData) {
      const dims = profileData.dimensions || {};
      const labels = Object.values(dims)
        .map((d: any) => d.label)
        .filter(Boolean)
        .slice(0, 5);
      if (labels.length > 0) {
        prompt += `\n\n## 已了解的对方特征\n${labels.join('、')}`;
      }
    }

    return prompt;
  }

  private triggerProfileExtraction(): void {
    if (!isLlmConfigured()) return;

    const userTurns = this.turns
      .slice(-10)
      .map(t => `${t.role === 'user' ? '用户' : 'AI'}: ${t.text}`)
      .join('\n');

    const extractionPrompt = `你是一个用户画像分析器。根据以下对话片段，抽取用户的人格特征证据。

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
      "label": "中文标签",
      "text": "用户原话证据片段",
      "confidence": 0.1到0.3
    }
  ],
  "emotion_summary": "整体情绪",
  "topics": ["话题关键词"]
}

## 规则
- 只从用户(user)发言中抽取
- 没有明确信息则返回空 evidence 数组
- confidence: 模糊表达 0.1，明确 0.2，反复强调 0.3`;

    // Fire-and-forget async extraction
    setTimeout(async () => {
      try {
        const res = await fetch(`${CONFIG.volcLlmEndpoint}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${CONFIG.volcApiKey}`,
          },
          body: JSON.stringify({
            model: CONFIG.volcLlmModel,
            messages: [
              { role: 'system', content: extractionPrompt },
              { role: 'user', content: `## 对话片段\n${userTurns}` },
            ],
            temperature: 0.3,
            max_tokens: 1024,
            response_format: { type: 'json_object' },
          }),
        });

        if (!res.ok) return;

        const data: any = await res.json();
        const content = data.choices?.[0]?.message?.content;
        if (!content) return;

        const result = JSON.parse(content);
        if (result.evidence?.length) {
          await this.mergeEvidence(result);
        }
      } catch (e: any) {
        console.error(`[Dialogue] Profile extraction failed: ${e.message}`);
      }
    }, 1000);
  }

  private async mergeEvidence(result: any): Promise<void> {
    const existing = await this.prisma.profileDocument.findUnique({
      where: { userId: this.userId },
    });

    const data: any = (existing?.data as any) || { dimensions: {}, aboutMe: '', personalities: [], traits: [] };
    if (!data.dimensions) data.dimensions = {};

    for (const ev of result.evidence) {
      if (!data.dimensions[ev.dimension]) {
        data.dimensions[ev.dimension] = {
          label: ev.label,
          score: 0,
          confidence: 0,
          evidence: [],
        };
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

    await this.prisma.profileDocument.upsert({
      where: { userId: this.userId },
      create: { userId: this.userId, data, version: 1 },
      update: { data, version: existing ? (existing.version + 1) : 1 },
    });
  }
}
