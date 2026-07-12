import { Prisma, PrismaClient } from '@prisma/client';
import { CONFIG, isLlmConfigured } from './config';
import {
  activateCard,
  analyzeAnswer,
  applyAnswerToCoverage,
  applyCorrectionToCoverage,
  createCoverageState,
  createEvidenceDrafts,
  getActiveCard,
  selectCandidateCards,
} from './coverage-engine';
import { prisma } from './prisma';
import { formatProbeCard, PROBE_CARD_BY_ID, PROBE_CARD_CATALOG_VERSION } from './probe-cards';
import {
  AnswerAnalysis,
  CoverageState,
  DIMENSION_IDS,
  DimensionId,
  EvidenceDraft,
  ProbeCard,
} from './profiling.types';
import { DialogueTurnData, SessionEndReason } from './types';

interface GenerateReplyContext {
  elapsedSec?: number;
  asrConfidence?: number;
  enterClosing?: boolean;
}

interface LlmTurnDecision {
  answerOptionId?: string;
  reasonLevel?: AnswerAnalysis['reasonLevel'];
  nextCardId?: string;
  reply?: string;
}

interface WrittenEvidence {
  id: string;
  draft: EvidenceDraft;
}

const DIMENSION_LABELS: Record<DimensionId, string> = {
  marriage_orientation: '婚恋取向',
  family_model: '家庭模式',
  values_core: '核心价值观',
  life_rhythm: '生活节奏',
  social_style: '社交风格',
  communication_style: '沟通风格',
  conflict_fear: '关系边界',
  interest_map: '兴趣偏好',
  future_plan: '未来规划',
  social_stance: '社会议题偏好',
};

const CONFIRMATION_PREFIXES = [
  '好，这一点我记下了。',
  '明白你的选择。',
  '可以，我再换个角度。',
  '收到，这个回答很清楚。',
];

const BANNED_REPLY_PATTERNS = [/懂/u, /嗯嗯/u, /宝/u, /亲/u, /姐妹/u, /闺蜜/u];
const RETRO_CORRECTION_PATTERNS = [
  /我刚才说的是/u,
  /我刚才说错了/u,
  /你听错了/u,
  /我纠正一下/u,
  /刚才那题/u,
  /不是[，,]?\s*我(刚才)?说的是/u,
];
const CRITICAL_SAFETY_PATTERNS = [/不想活了/u, /想自杀/u, /准备自杀/u, /想伤害自己/u, /正在自残/u];

export class DialogueService {
  private readonly prisma: PrismaClient;
  private readonly userId: string;
  private turnCount = 0;
  private turns: DialogueTurnData[] = [];
  private sessionId: string | null = null;
  private coverage: CoverageState = createCoverageState();
  private openingLine: string | null = null;
  private ended = false;
  private awaitingClosingConfirmation = false;
  private closingComplete = false;
  private sessionEvidenceLabels: string[] = [];

  constructor(userId: string) {
    this.userId = userId;
    this.prisma = prisma;
  }

  async init(): Promise<string> {
    const [savedCoverage, previousSessions] = await Promise.all([
      this.prisma.voiceCoverageState.findUnique({ where: { userId: this.userId } }),
      this.prisma.voiceSession.count({ where: { userId: this.userId } }),
    ]);

    this.coverage = createCoverageState(savedCoverage?.data as Partial<CoverageState> | undefined);
    this.ensureActiveCard(0);

    const session = await this.prisma.voiceSession.create({
      data: {
        userId: this.userId,
        status: 'ongoing',
        roundNo: previousSessions + 1,
        coverageSnapshot: this.toJson(this.coverage),
        probeCardVersion: PROBE_CARD_CATALOG_VERSION,
      },
    });
    this.sessionId = session.id;

    const opening = this.prepareOpeningLine();
    this.turns.push({ role: 'ai', text: opening });
    await this.saveTurn('ai', opening);
    await this.persistCoverage();
    return session.id;
  }

  getOpeningLine(): string {
    this.ensureActiveCard(0);
    return this.prepareOpeningLine();
  }

  async generateReply(userText: string, context: GenerateReplyContext = {}): Promise<string> {
    this.turns.push({ role: 'user', text: userText });
    this.turnCount += 1;
    const userTurnId = await this.saveTurn('user', userText, context.asrConfidence);

    if (CRITICAL_SAFETY_PATTERNS.some((pattern) => pattern.test(userText))) {
      this.awaitingClosingConfirmation = false;
      this.closingComplete = false;
      await this.persistCoverage();
      return this.finishAiReply('我先不继续问选项。请马上联系身边可信任的人或当地紧急服务陪着你，你现在有马上伤害自己的打算吗？');
    }

    if (this.awaitingClosingConfirmation) {
      const reply = await this.handleClosingConfirmation(userText, userTurnId);
      return this.finishAiReply(reply);
    }

    const elapsedSec = context.elapsedSec ?? this.turnCount * 45;
    const activeCard = getActiveCard(this.coverage);
    if (!activeCard) {
      const nextCard = this.ensureActiveCard(elapsedSec);
      const reply = `我们从一个容易选的开始。${formatProbeCard(nextCard)}`;
      await this.persistCoverage();
      return this.finishAiReply(reply);
    }

    const previousCard = this.getPreviousAnsweredCard();
    if (previousCard && RETRO_CORRECTION_PATTERNS.some((pattern) => pattern.test(userText))) {
      const analysis = analyzeAnswer(previousCard, userText, 1, undefined, 'correction', context.asrConfidence);
      let drafts = createEvidenceDrafts(previousCard, userText, analysis);
      if (!analysis.optionId) {
        const dimension = this.latestProbedDimension();
        drafts = dimension ? [{
          dimension,
          label: `用户修正${DIMENSION_LABELS[dimension]}理解`,
          text: userText,
          confidenceDelta: 0.3,
          cardId: previousCard.id,
          cardVersion: previousCard.version,
          optionMappingVersion: previousCard.optionMappingVersion,
          sourceQuestionIds: [...previousCard.sourceQuestionIds],
          targetDimensions: [...previousCard.targetDimensions],
          isCorrection: true,
        }] : [];
      }
      this.coverage = applyCorrectionToCoverage(this.coverage, previousCard, drafts);
      const written = await this.writeEvidence(drafts, userTurnId, true);
      if (written.length > 0) {
        this.coverage.lastEvidenceId = written[written.length - 1].id;
        await this.mergeProfileEvidence(written);
      }
      await this.persistCoverage();
      return this.finishAiReply(`好，我按你的修正来记，当前这题还没算回答。${formatProbeCard(activeCard)}`);
    }

    const initialCandidates = selectCandidateCards(this.coverage, elapsedSec, 3);
    const decision = await this.callOrchestrationLlm(userText, activeCard, initialCandidates);
    const analysis = analyzeAnswer(
      activeCard,
      userText,
      this.coverage.activeFollowUpCount,
      decision?.answerOptionId,
      decision?.reasonLevel,
      context.asrConfidence,
    );
    const drafts = createEvidenceDrafts(activeCard, userText, analysis);
    this.coverage = applyAnswerToCoverage(
      this.coverage,
      activeCard,
      analysis,
      drafts,
      this.sessionId || 'mock-session',
    );

    const written = await this.writeEvidence(drafts, userTurnId, analysis.isCorrection);
    if (written.length > 0) {
      this.coverage.lastEvidenceId = written[written.length - 1].id;
      this.sessionEvidenceLabels.push(...drafts.map((draft) => draft.label));
      await this.mergeProfileEvidence(written);
    }

    if (analysis.needsFollowUp) {
      await this.persistCoverage();
      return this.finishAiReply(`我再把选项说清楚一点。${formatProbeCard(activeCard)}`);
    }

    if (context.enterClosing) {
      this.awaitingClosingConfirmation = true;
      const summary = await this.buildClosingSummary();
      await this.persistCoverage();
      return this.finishAiReply(summary);
    }

    const candidates = selectCandidateCards(this.coverage, elapsedSec, 3);
    if (candidates.length === 0) {
      this.awaitingClosingConfirmation = true;
      const summary = await this.buildClosingSummary();
      await this.persistCoverage();
      return this.finishAiReply(summary);
    }
    const chosenCard = this.chooseNextCard(candidates, decision?.nextCardId);
    this.coverage = activateCard(this.coverage, chosenCard);
    await this.persistCoverage();

    const reply = this.isValidCardReply(decision?.reply, chosenCard)
      ? decision!.reply!
      : this.buildFallbackReply(chosenCard, analysis);
    return this.finishAiReply(reply);
  }

  async endSession(durationSec: number, reason: SessionEndReason): Promise<void> {
    if (this.ended) return;
    this.ended = true;
    await this.persistCoverage();
    if (!this.sessionId) return;

    const status = reason === 'timeout_ended' ? 'timeout' : 'ended';
    await this.prisma.voiceSession.updateMany({
      where: { id: this.sessionId, status: 'ongoing' },
      data: {
        status,
        endReason: reason,
        endedAt: new Date(),
        durationSec,
        coverageSnapshot: this.toJson(this.coverage),
      },
    }).catch((error: Error) => {
      console.error(`[Dialogue] Failed to end session: ${error.message}`);
    });
  }

  getTurnCount(): number {
    return this.turnCount;
  }

  isAwaitingClosing(): boolean {
    return this.awaitingClosingConfirmation;
  }

  isClosingComplete(): boolean {
    return this.closingComplete;
  }

  private ensureActiveCard(elapsedSec: number): ProbeCard {
    const active = getActiveCard(this.coverage);
    if (active) return active;
    const selected = selectCandidateCards(this.coverage, elapsedSec, 1)[0] || PROBE_CARD_BY_ID.values().next().value;
    if (!selected) throw new Error('Probe card catalog is empty');
    this.coverage = activateCard(this.coverage, selected);
    return selected;
  }

  private prepareOpeningLine(): string {
    if (this.openingLine) return this.openingLine;
    const active = this.ensureActiveCard(0);
    const intro = this.coverage.usedCardIds.length > 0
      ? '这次我们接着聊，我还是给你几个容易选的选项，你选最接近的就行。'
      : '这通我会问你一些容易回答的选择题，你先选最接近的，想展开再多说。';
    this.openingLine = `${intro}${formatProbeCard(active)}`;
    return this.openingLine;
  }

  private async callOrchestrationLlm(
    userText: string,
    activeCard: ProbeCard,
    candidates: ProbeCard[],
  ): Promise<LlmTurnDecision | null> {
    if (!isLlmConfigured() || candidates.length === 0) return null;

    const candidateText = candidates
      .map((card) => `- ${card.id}: ${formatProbeCard(card)}`)
      .join('\n');
    const activeOptions = activeCard.options.map((option) => `${option.id}=${option.label}`).join('；');
    const systemPrompt = `你是小雅，一位清楚、放松、克制的语音访谈主持人。目标是从候选问题中选择下一题，并简短回应用户。

上一题：${formatProbeCard(activeCard)}
上一题合法选项：${activeOptions}

下一题候选：
${candidateText}

只输出 JSON：
{"answerOptionId":"A或B或C或D或null","reasonLevel":"choice或reason或story或correction","nextCardId":"候选ID","reply":"轻确认加下一题"}

规则：
- nextCardId 只能来自候选列表，不能创造问题。
- reply 必须忠实使用所选卡片的 3-4 个选项，不能改变选项含义。
- reply 1-2 句，只能有一个问号，不能只做陈述。
- 语气 70% 主持人、30% 朋友；不使用“懂、嗯嗯、宝、亲、姐妹、闺蜜”。
- 不提画像、人格采样、66题或内部维度。
- 用户只选一项是 choice；带理由是 reason；有具体经历是 story；明确纠正是 correction。`;

    try {
      const recentTurns = this.turns.slice(-8).map((turn) => ({
        role: (turn.role === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
        content: turn.text,
      }));
      const response = await fetch(`${CONFIG.volcLlmEndpoint}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${CONFIG.volcApiKey}`,
        },
        body: JSON.stringify({
          model: CONFIG.volcLlmModel,
          messages: [{ role: 'system', content: systemPrompt }, ...recentTurns],
          temperature: 0.4,
          max_tokens: 320,
          response_format: { type: 'json_object' },
        }),
      });
      if (!response.ok) {
        console.error(`[Dialogue] Orchestration LLM error ${response.status}`);
        return null;
      }

      const data = await response.json() as any;
      const raw = data.choices?.[0]?.message?.content;
      if (!raw) return null;
      const parsed = JSON.parse(raw) as LlmTurnDecision;
      return {
        answerOptionId: typeof parsed.answerOptionId === 'string' ? parsed.answerOptionId : undefined,
        reasonLevel: ['choice', 'reason', 'story', 'correction'].includes(parsed.reasonLevel || '')
          ? parsed.reasonLevel
          : undefined,
        nextCardId: typeof parsed.nextCardId === 'string' ? parsed.nextCardId : undefined,
        reply: typeof parsed.reply === 'string' ? parsed.reply.trim() : undefined,
      };
    } catch (error: any) {
      console.error(`[Dialogue] Orchestration LLM failed: ${error.message}`);
      return null;
    }
  }

  private chooseNextCard(candidates: ProbeCard[], llmCardId?: string): ProbeCard {
    const selected = llmCardId ? candidates.find((card) => card.id === llmCardId) : undefined;
    const fallback = selected || candidates[0];
    if (!fallback) throw new Error('No eligible probe card');
    return fallback;
  }

  private isValidCardReply(reply: string | undefined, card: ProbeCard): boolean {
    if (!reply || reply.length > 220) return false;
    if (BANNED_REPLY_PATTERNS.some((pattern) => pattern.test(reply))) return false;
    const questionMarks = reply.match(/[？?]/gu)?.length || 0;
    if (questionMarks !== 1) return false;
    const includedOptions = card.options.filter((option) => reply.includes(option.label)).length;
    return includedOptions >= Math.min(3, card.options.length);
  }

  private buildFallbackReply(card: ProbeCard, analysis: AnswerAnalysis): string {
    let prefix: string;
    if (analysis.isSkip) prefix = '可以，我们换一个。';
    else if (analysis.isCorrection) prefix = '好，我按你刚才的修正来记。';
    else if (this.turnCount % 4 === 0 && this.sessionEvidenceLabels.length >= 2) {
      const labels = [...new Set(this.sessionEvidenceLabels)].slice(-2).join('、');
      prefix = `目前几项里，你比较偏${labels}。`;
    } else {
      prefix = CONFIRMATION_PREFIXES[(this.turnCount - 1) % CONFIRMATION_PREFIXES.length];
    }
    return `${prefix}${formatProbeCard(card)}`;
  }

  private async writeEvidence(
    drafts: EvidenceDraft[],
    turnId: string | null,
    isCorrection: boolean,
  ): Promise<WrittenEvidence[]> {
    if (!this.sessionId || drafts.length === 0) return [];
    const supersedesEvidenceId = isCorrection ? this.coverage.lastEvidenceId : undefined;

    try {
      if (supersedesEvidenceId) {
        await this.prisma.voiceEvidence.updateMany({
          where: { id: supersedesEvidenceId, userId: this.userId, status: 'active' },
          data: { status: 'superseded' },
        });
      }

      const written: WrittenEvidence[] = [];
      for (const draft of drafts) {
        const row = await this.prisma.voiceEvidence.create({
          data: {
            userId: this.userId,
            sessionId: this.sessionId,
            turnId,
            dimension: draft.dimension,
            label: draft.label,
            text: draft.text,
            confidenceDelta: draft.confidenceDelta,
            cardId: draft.cardId,
            cardVersion: draft.cardVersion,
            optionId: draft.optionId,
            optionMappingVersion: draft.optionMappingVersion,
            sourceQuestionIds: this.toJson(draft.sourceQuestionIds),
            targetDimensions: this.toJson(draft.targetDimensions),
            status: 'active',
            supersedesEvidenceId,
          },
        });
        written.push({ id: row.id, draft });
      }
      return written;
    } catch (error: any) {
      console.error(`[Dialogue] Failed to persist evidence: ${error.message}`);
      return [];
    }
  }

  private async mergeProfileEvidence(written: WrittenEvidence[]): Promise<void> {
    if (written.length === 0) return;
    try {
      const existing = await this.prisma.profileDocument.findUnique({ where: { userId: this.userId } });
      const data: any = existing?.data || { dimensions: {}, aboutMe: '', personalities: [], traits: [] };
      if (!data.dimensions) data.dimensions = {};

      for (const { id, draft } of written) {
        if (!data.dimensions[draft.dimension]) {
          data.dimensions[draft.dimension] = {
            label: draft.label,
            score: 0,
            confidence: 0,
            evidence: [],
          };
        }
        const dimension = data.dimensions[draft.dimension];
        if (draft.isCorrection && Array.isArray(dimension.evidence)) {
          const previous = [...dimension.evidence].reverse().find((item: any) => item.status !== 'superseded');
          if (previous) previous.status = 'superseded';
        }
        dimension.evidence.push({
          id,
          text: draft.text,
          label: draft.label,
          confidence_delta: draft.confidenceDelta,
          cardId: draft.cardId,
          cardVersion: draft.cardVersion,
          optionId: draft.optionId,
          optionMappingVersion: draft.optionMappingVersion,
          sourceQuestionIds: draft.sourceQuestionIds,
          targetDimensions: draft.targetDimensions,
          status: 'active',
          timestamp: new Date().toISOString(),
        });
        dimension.confidence = Math.min(1, Number(dimension.confidence || 0) + draft.confidenceDelta);
        dimension.label = draft.label;
      }

      data.meta = data.meta || {};
      data.meta.voiceCoverage = Object.fromEntries(
        DIMENSION_IDS.map((dimension) => [dimension, this.coverage.dimensions[dimension].status]),
      );
      await this.prisma.profileDocument.upsert({
        where: { userId: this.userId },
        create: { userId: this.userId, data, version: 1 },
        update: { data, version: existing ? existing.version + 1 : 1 },
      });
    } catch (error: any) {
      console.error(`[Dialogue] Failed to merge profile evidence: ${error.message}`);
    }
  }

  private async persistCoverage(): Promise<void> {
    try {
      await this.prisma.voiceCoverageState.upsert({
        where: { userId: this.userId },
        create: { userId: this.userId, data: this.toJson(this.coverage), version: 1 },
        update: {
          data: this.toJson(this.coverage),
          version: { increment: 1 },
        },
      });
      if (this.sessionId) {
        await this.prisma.voiceSession.update({
          where: { id: this.sessionId },
          data: { coverageSnapshot: this.toJson(this.coverage) },
        });
      }
    } catch (error: any) {
      console.error(`[Dialogue] Failed to persist coverage: ${error.message}`);
    }
  }

  private async buildClosingSummary(): Promise<string> {
    const labels = [...new Set(this.sessionEvidenceLabels)];
    if (labels.length < 3) {
      try {
        const profile = await this.prisma.profileDocument.findUnique({ where: { userId: this.userId } });
        const dimensions = (profile?.data as any)?.dimensions || {};
        for (const dimension of Object.values(dimensions) as any[]) {
          if (dimension?.label && !labels.includes(dimension.label)) labels.push(dimension.label);
        }
      } catch {
        // The session evidence is still sufficient for a best-effort summary.
      }
    }
    const points = labels.slice(-5);
    const summary = points.length > 0
      ? points.map((label, index) => `${index + 1}，${label}`).join('；')
      : '你更愿意从选项开始，再按需要补充原因';
    return `我先把目前的理解暂时记成这几项：${summary}。有没有哪一点不准确？`;
  }

  private async handleClosingConfirmation(userText: string, turnId: string | null): Promise<string> {
    const isCorrection = [/不是/u, /不准确/u, /改成/u, /应该是/u, /你听错/u].some((pattern) => pattern.test(userText));
    if (isCorrection) await this.recordClosingCorrection(userText, turnId);
    this.awaitingClosingConfirmation = false;
    this.closingComplete = true;
    await this.persistCoverage();
    return isCorrection
      ? '好，我把你的修正作为高优先级记录了，这次先到这里。'
      : '好，这次的内容已经记下了，我们下次接着聊。';
  }

  private async recordClosingCorrection(userText: string, turnId: string | null): Promise<void> {
    const dimension = await this.extractCorrectionDimension(userText) || this.latestProbedDimension();
    if (!dimension) return;
    const draft: EvidenceDraft = {
      dimension,
      label: `用户修正${DIMENSION_LABELS[dimension]}理解`,
      text: userText,
      confidenceDelta: 0.3,
      cardId: 'closing_summary_correction',
      cardVersion: PROBE_CARD_CATALOG_VERSION,
      optionMappingVersion: 1,
      sourceQuestionIds: [],
      targetDimensions: [dimension],
      isCorrection: true,
    };
    const current = this.coverage.dimensions[dimension];
    this.coverage.dimensions[dimension] = {
      ...current,
      confidence: Math.min(1, current.confidence + 0.3),
      evidenceCount: current.evidenceCount + 1,
      status: 'needs_recheck',
      lastProbedAt: new Date().toISOString(),
      lastCardId: draft.cardId,
    };
    const written = await this.writeEvidence([draft], turnId, true);
    if (written.length > 0) {
      this.coverage.lastEvidenceId = written[0].id;
      await this.mergeProfileEvidence(written);
    }
  }

  private async extractCorrectionDimension(userText: string): Promise<DimensionId | undefined> {
    if (!isLlmConfigured()) return undefined;
    try {
      const response = await fetch(`${CONFIG.volcLlmEndpoint}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${CONFIG.volcApiKey}`,
        },
        body: JSON.stringify({
          model: CONFIG.volcLlmModel,
          messages: [
            {
              role: 'system',
              content: `判断用户修正的是哪个维度。只输出 JSON {"dimension":"ID"}。合法 ID：${DIMENSION_IDS.join(', ')}`,
            },
            { role: 'user', content: userText },
          ],
          temperature: 0,
          max_tokens: 64,
          response_format: { type: 'json_object' },
        }),
      });
      if (!response.ok) return undefined;
      const data = await response.json() as any;
      const parsed = JSON.parse(data.choices?.[0]?.message?.content || '{}');
      return DIMENSION_IDS.includes(parsed.dimension) ? parsed.dimension : undefined;
    } catch {
      return undefined;
    }
  }

  private latestProbedDimension(): DimensionId | undefined {
    return [...DIMENSION_IDS]
      .filter((dimension) => this.coverage.dimensions[dimension].lastProbedAt)
      .sort((left, right) => {
        const leftTime = this.coverage.dimensions[left].lastProbedAt || '';
        const rightTime = this.coverage.dimensions[right].lastProbedAt || '';
        return rightTime.localeCompare(leftTime);
      })[0];
  }

  private getPreviousAnsweredCard(): ProbeCard | undefined {
    const previousCardId = this.coverage.usedCardIds[this.coverage.usedCardIds.length - 1];
    return previousCardId ? PROBE_CARD_BY_ID.get(previousCardId) : undefined;
  }

  private async saveTurn(role: 'user' | 'ai', text: string, asrConfidence?: number): Promise<string | null> {
    if (!this.sessionId) return null;
    try {
      const row = await this.prisma.dialogueTurn.create({
        data: {
          sessionId: this.sessionId,
          idx: this.turns.length - 1,
          role,
          text,
          asrConfidence: role === 'user' ? asrConfidence : undefined,
        },
      });
      return row.id;
    } catch (error: any) {
      console.error(`[Dialogue] Failed to save ${role} turn: ${error.message}`);
      return null;
    }
  }

  private async finishAiReply(reply: string): Promise<string> {
    this.turns.push({ role: 'ai', text: reply });
    await this.saveTurn('ai', reply);
    return reply;
  }

  private toJson(value: unknown): Prisma.InputJsonValue {
    return value as Prisma.InputJsonValue;
  }
}
