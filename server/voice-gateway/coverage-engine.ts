import {
  AnswerAnalysis,
  CoverageState,
  DimensionCoverage,
  DimensionId,
  DIMENSION_IDS,
  EvidenceDraft,
  ProbeCard,
  ProbeStage,
} from './profiling.types';
import { PROBE_CARD_BY_ID, PROBE_CARDS } from './probe-cards';

const DIMENSION_WEIGHTS: Record<DimensionId, number> = {
  marriage_orientation: 1.4,
  family_model: 1.4,
  values_core: 1.4,
  life_rhythm: 1,
  social_style: 1,
  communication_style: 1.4,
  conflict_fear: 1.4,
  interest_map: 1,
  future_plan: 1,
  social_stance: 0.8,
};

const SKIP_PATTERNS = [/跳过/u, /不想(说|聊|回答)/u, /换一个/u, /这个不聊/u];
const CORRECTION_PATTERNS = [
  /我刚才说的是/u,
  /我刚才说错了/u,
  /你听错了/u,
  /我纠正一下/u,
  /刚才那题/u,
  /不是[，,]?\s*我(刚才)?说的是/u,
];
const STORY_PATTERNS = [/有一次/u, /之前/u, /去年/u, /当时/u, /比如/u, /例如/u, /我遇到过/u];
const REASON_PATTERNS = [/因为/u, /所以/u, /主要是/u, /一般/u, /通常/u, /我会/u];

function emptyDimension(): DimensionCoverage {
  return { confidence: 0, evidenceCount: 0, status: 'missing' };
}

export function createCoverageState(raw?: Partial<CoverageState> | null): CoverageState {
  const dimensions = {} as Record<DimensionId, DimensionCoverage>;
  for (const dimension of DIMENSION_IDS) {
    const saved = raw?.dimensions?.[dimension];
    dimensions[dimension] = saved ? { ...emptyDimension(), ...saved } : emptyDimension();
  }

  return {
    version: 1,
    dimensions,
    usedCardIds: [...(raw?.usedCardIds || [])],
    sessionUsedCardIds: [],
    sessionSkippedDimensions: [],
    activeCardId: raw?.activeCardId,
    activeFollowUpCount: 0,
    lastEvidenceId: raw?.lastEvidenceId,
  };
}

export function stageForElapsed(elapsedSec: number): ProbeStage {
  if (elapsedSec < 180) return 'warmup';
  if (elapsedSec < 330) return 'communication';
  if (elapsedSec < 480) return 'relationship';
  if (elapsedSec < 600) return 'values';
  if (elapsedSec < 720) return 'social';
  if (elapsedSec < 825) return 'future';
  return 'gap_fill';
}

export function selectCandidateCards(
  state: CoverageState,
  elapsedSec: number,
  limit = 3,
): ProbeCard[] {
  const stage = stageForElapsed(elapsedSec);
  const unusedExists = PROBE_CARDS.some((candidate) => !state.usedCardIds.includes(candidate.id));

  return PROBE_CARDS
    .filter((candidate) => candidate.id !== state.activeCardId)
    .filter((candidate) => !candidate.targetDimensions.some((dimension) => state.sessionSkippedDimensions.includes(dimension)))
    .map((candidate) => {
      const dimensionScore = candidate.targetDimensions.reduce((sum, dimension) => {
        const coverage = state.dimensions[dimension];
        const gap = Math.max(0.15, 1 - coverage.confidence);
        return sum + DIMENSION_WEIGHTS[dimension] * gap;
      }, 0) / candidate.targetDimensions.length;
      const stageFit = stage === 'gap_fill' || candidate.stage === stage ? 3 : 0.35;
      const novelty = state.sessionUsedCardIds.includes(candidate.id)
        ? 0.05
        : state.usedCardIds.includes(candidate.id) ? 0.35 : 1;
      const catalogNovelty = unusedExists && state.usedCardIds.includes(candidate.id) ? 0.5 : 1;
      return { candidate, score: dimensionScore * stageFit * novelty * catalogNovelty };
    })
    .sort((left, right) => right.score - left.score || left.candidate.id.localeCompare(right.candidate.id))
    .slice(0, limit)
    .map(({ candidate }) => candidate);
}

function matchOrdinal(text: string, optionCount: number): number | undefined {
  const normalized = text.trim().toUpperCase();
  const letter = normalized.match(/(?:^|[选是])\s*([A-D])(?:\b|[项个，。,.])/u)?.[1];
  if (letter) return letter.charCodeAt(0) - 65;

  const ordinals = [/[第一1一]个|第一项/u, /[第二2二]个|第二项/u, /[第三3三]个|第三项/u, /[第四4四]个|第四项/u];
  const index = ordinals.findIndex((pattern) => pattern.test(text));
  return index >= 0 && index < optionCount ? index : undefined;
}

export function matchOption(card: ProbeCard, text: string, suggestedOptionId?: string): string | undefined {
  const ordinal = matchOrdinal(text, card.options.length);
  if (ordinal !== undefined) return card.options[ordinal]?.id;

  const matches = card.options
    .map((item) => ({
      id: item.id,
      score: item.keywords.filter((keyword) => text.includes(keyword)).reduce((sum, keyword) => sum + keyword.length, 0),
    }))
    .sort((left, right) => right.score - left.score);
  if (matches[0]?.score > 0) return matches[0].id;
  return suggestedOptionId && card.options.some((item) => item.id === suggestedOptionId)
    ? suggestedOptionId
    : undefined;
}

export function analyzeAnswer(
  card: ProbeCard,
  text: string,
  followUpCount: number,
  suggestedOptionId?: string,
  suggestedReasonLevel?: AnswerAnalysis['reasonLevel'],
  asrConfidence?: number,
): AnswerAnalysis {
  const isCorrection = CORRECTION_PATTERNS.some((pattern) => pattern.test(text));
  const isSkip = SKIP_PATTERNS.some((pattern) => pattern.test(text));
  const optionId = isSkip ? undefined : matchOption(card, text, suggestedOptionId);

  let reasonLevel: AnswerAnalysis['reasonLevel'] = 'choice';
  if (isCorrection) reasonLevel = 'correction';
  else if (suggestedReasonLevel && suggestedReasonLevel !== 'correction') reasonLevel = suggestedReasonLevel;
  else if (text.length >= 36 || STORY_PATTERNS.some((pattern) => pattern.test(text))) reasonLevel = 'story';
  else if (text.length >= 14 || REASON_PATTERNS.some((pattern) => pattern.test(text))) reasonLevel = 'reason';

  let confidenceDelta = reasonLevel === 'correction'
    ? 0.3
    : reasonLevel === 'story' ? 0.27 : reasonLevel === 'reason' ? 0.2 : 0.12;
  if (asrConfidence !== undefined && asrConfidence < 0.7) confidenceDelta = Math.min(0.1, confidenceDelta);

  return {
    optionId,
    confidenceDelta,
    isCorrection,
    isSkip,
    needsFollowUp: !isSkip && !isCorrection && !optionId && text.length < 12 && followUpCount < 1,
    reasonLevel,
  };
}

export function createEvidenceDrafts(card: ProbeCard, text: string, analysis: AnswerAnalysis): EvidenceDraft[] {
  if (analysis.isSkip || analysis.needsFollowUp) return [];
  const selected = card.options.find((item) => item.id === analysis.optionId);
  const signals = selected?.signals.length
    ? selected.signals
    : card.targetDimensions.map((dimension) => ({ dimension, label: '用户对该主题给出补充回答' }));

  return signals.map((signal) => ({
    dimension: signal.dimension,
    label: signal.label,
    text,
    confidenceDelta: selected ? analysis.confidenceDelta : Math.min(0.1, analysis.confidenceDelta),
    cardId: card.id,
    cardVersion: card.version,
    optionId: selected?.id,
    optionMappingVersion: card.optionMappingVersion,
    sourceQuestionIds: [...card.sourceQuestionIds],
    targetDimensions: [...card.targetDimensions],
    isCorrection: analysis.isCorrection,
  }));
}

export function applyAnswerToCoverage(
  state: CoverageState,
  card: ProbeCard,
  analysis: AnswerAnalysis,
  drafts: EvidenceDraft[],
  sessionId: string,
  now = new Date(),
): CoverageState {
  const next: CoverageState = {
    ...state,
    dimensions: Object.fromEntries(
      DIMENSION_IDS.map((dimension) => [dimension, { ...state.dimensions[dimension] }]),
    ) as Record<DimensionId, DimensionCoverage>,
    usedCardIds: [...state.usedCardIds],
    sessionUsedCardIds: [...state.sessionUsedCardIds],
    sessionSkippedDimensions: [...state.sessionSkippedDimensions],
  };

  if (analysis.needsFollowUp) {
    next.activeFollowUpCount += 1;
    return next;
  }

  if (!next.usedCardIds.includes(card.id)) next.usedCardIds.push(card.id);
  if (!next.sessionUsedCardIds.includes(card.id)) next.sessionUsedCardIds.push(card.id);
  next.activeCardId = undefined;
  next.activeFollowUpCount = 0;

  if (analysis.isSkip) {
    for (const dimension of card.targetDimensions) {
      if (!next.sessionSkippedDimensions.includes(dimension)) next.sessionSkippedDimensions.push(dimension);
      next.dimensions[dimension] = {
        ...next.dimensions[dimension],
        status: 'skipped',
        skippedInSessionId: sessionId,
        lastProbedAt: now.toISOString(),
        lastCardId: card.id,
      };
    }
    return next;
  }

  for (const draft of drafts) {
    const current = next.dimensions[draft.dimension];
    const confidence = Math.min(1, current.confidence + draft.confidenceDelta);
    next.dimensions[draft.dimension] = {
      ...current,
      confidence,
      evidenceCount: current.evidenceCount + 1,
      status: draft.isCorrection && current.evidenceCount > 0
        ? 'needs_recheck'
        : confidence >= 0.3 ? 'covered' : 'weak',
      lastProbedAt: now.toISOString(),
      lastCardId: card.id,
      skippedInSessionId: undefined,
    };
  }

  return next;
}

export function applyCorrectionToCoverage(
  state: CoverageState,
  card: ProbeCard,
  drafts: EvidenceDraft[],
  now = new Date(),
): CoverageState {
  const next: CoverageState = {
    ...state,
    dimensions: Object.fromEntries(
      DIMENSION_IDS.map((dimension) => [dimension, { ...state.dimensions[dimension] }]),
    ) as Record<DimensionId, DimensionCoverage>,
    usedCardIds: [...state.usedCardIds],
    sessionUsedCardIds: [...state.sessionUsedCardIds],
    sessionSkippedDimensions: [...state.sessionSkippedDimensions],
  };

  for (const draft of drafts) {
    const current = next.dimensions[draft.dimension];
    next.dimensions[draft.dimension] = {
      ...current,
      confidence: Math.min(1, current.confidence + draft.confidenceDelta),
      evidenceCount: current.evidenceCount + 1,
      status: 'needs_recheck',
      lastProbedAt: now.toISOString(),
      lastCardId: card.id,
    };
  }
  return next;
}

export function activateCard(state: CoverageState, card: ProbeCard): CoverageState {
  return { ...state, activeCardId: card.id, activeFollowUpCount: 0 };
}

export function getActiveCard(state: CoverageState): ProbeCard | undefined {
  return state.activeCardId ? PROBE_CARD_BY_ID.get(state.activeCardId) : undefined;
}
