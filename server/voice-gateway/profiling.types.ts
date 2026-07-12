export const DIMENSION_IDS = [
  'marriage_orientation',
  'family_model',
  'values_core',
  'life_rhythm',
  'social_style',
  'communication_style',
  'conflict_fear',
  'interest_map',
  'future_plan',
  'social_stance',
] as const;

export type DimensionId = typeof DIMENSION_IDS[number];

export type ProbeStage =
  | 'warmup'
  | 'communication'
  | 'relationship'
  | 'values'
  | 'social'
  | 'future'
  | 'gap_fill';

export interface ProbeSignal {
  dimension: DimensionId;
  label: string;
}

export interface ProbeOption {
  id: string;
  label: string;
  signals: ProbeSignal[];
  keywords: string[];
}

export interface ProbeCard {
  id: string;
  version: number;
  optionMappingVersion: number;
  stage: ProbeStage;
  prompt: string;
  options: ProbeOption[];
  sourceQuestionIds: string[];
  targetDimensions: DimensionId[];
  followUpPrompt: string;
}

export type CoverageStatus = 'missing' | 'weak' | 'covered' | 'skipped' | 'needs_recheck';

export interface DimensionCoverage {
  confidence: number;
  evidenceCount: number;
  status: CoverageStatus;
  lastProbedAt?: string;
  lastCardId?: string;
  skippedInSessionId?: string;
}

export interface CoverageState {
  version: number;
  dimensions: Record<DimensionId, DimensionCoverage>;
  usedCardIds: string[];
  sessionUsedCardIds: string[];
  sessionSkippedDimensions: DimensionId[];
  activeCardId?: string;
  activeFollowUpCount: number;
  lastEvidenceId?: string;
}

export interface AnswerAnalysis {
  optionId?: string;
  confidenceDelta: number;
  isCorrection: boolean;
  isSkip: boolean;
  needsFollowUp: boolean;
  reasonLevel: 'choice' | 'reason' | 'story' | 'correction';
}

export interface EvidenceDraft {
  dimension: DimensionId;
  label: string;
  text: string;
  confidenceDelta: number;
  cardId: string;
  cardVersion: number;
  optionId?: string;
  optionMappingVersion: number;
  sourceQuestionIds: string[];
  targetDimensions: DimensionId[];
  isCorrection: boolean;
}
