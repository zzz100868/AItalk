export interface DimensionData {
  label: string;
  score: number;
  confidence: number;
  evidence: Array<{ text: string; confidence_delta: number; timestamp: string }>;
}

export interface ProfileData {
  dimensions: Record<string, DimensionData>;
  aboutMe?: string;
  personalities?: string[];
  traits?: string[];
  meta?: { chatMood?: string; chatTopics?: number };
}

export interface MatchCandidate {
  userId: string;
  gender: string | null;
  city: string | null;
  birthYear: number | null;
  orientation: string | null;
  nickname: string;
  avatar: string;
  bio: string;
  profile: ProfileData;
  activityScore: number;
}

export interface MatchPair {
  userA: MatchCandidate;
  userB: MatchCandidate;
  score: number;
}

export interface MatchCopyResult {
  reason: string;
  icebreakers: string[];
  insight: string;
}

export type DimensionMatchMode = 'similar' | 'complementary' | 'mixed';

export interface DimensionConfig {
  id: string;
  mode: DimensionMatchMode;
  weight: number;
}

export const DIMENSION_CONFIGS: DimensionConfig[] = [
  { id: 'marriage_orientation', mode: 'similar', weight: 0.15 },
  { id: 'family_model', mode: 'similar', weight: 0.12 },
  { id: 'values_core', mode: 'similar', weight: 0.15 },
  { id: 'life_rhythm', mode: 'similar', weight: 0.10 },
  { id: 'social_style', mode: 'complementary', weight: 0.08 },
  { id: 'communication_style', mode: 'complementary', weight: 0.10 },
  { id: 'conflict_fear', mode: 'similar', weight: 0.10 },
  { id: 'interest_map', mode: 'mixed', weight: 0.08 },
  { id: 'future_plan', mode: 'similar', weight: 0.08 },
  { id: 'social_stance', mode: 'similar', weight: 0.04 },
];

export const SCORE_WEIGHTS = {
  complementary: 0.40,
  interestOverlap: 0.25,
  stageFit: 0.25,
  activityBonus: 0.10,
};

export const COLD_START_THRESHOLD = 50;
