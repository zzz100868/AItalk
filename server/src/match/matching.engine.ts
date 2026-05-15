import {
  MatchCandidate,
  MatchPair,
  DimensionData,
  DIMENSION_CONFIGS,
  SCORE_WEIGHTS,
  COLD_START_THRESHOLD,
} from './match.types';

// ============ 硬条件过滤 ============

function isGenderCompatible(a: MatchCandidate, b: MatchCandidate): boolean {
  if (!a.gender || !b.gender || !a.orientation || !b.orientation) return true;

  const aWants = getPreferredGender(a.orientation, a.gender);
  const bWants = getPreferredGender(b.orientation, b.gender);

  return aWants.includes(b.gender) && bWants.includes(a.gender);
}

function getPreferredGender(orientation: string, selfGender: string): string[] {
  switch (orientation) {
    case 'straight':
      return selfGender === 'male' ? ['female'] : ['male'];
    case 'gay':
      return [selfGender];
    case 'bisexual':
      return ['male', 'female'];
    default:
      return ['male', 'female'];
  }
}

function isAgeDiffOk(a: MatchCandidate, b: MatchCandidate, maxDiff: number): boolean {
  if (!a.birthYear || !b.birthYear) return true;
  return Math.abs(a.birthYear - b.birthYear) <= maxDiff;
}

function isSameCity(a: MatchCandidate, b: MatchCandidate): boolean {
  if (!a.city || !b.city) return true;
  return a.city === b.city;
}

export function filterCandidatePair(
  a: MatchCandidate,
  b: MatchCandidate,
  recentMatchPairs: Set<string>,
  coldStart: boolean,
): boolean {
  if (a.userId === b.userId) return false;
  if (!isGenderCompatible(a, b)) return false;

  const maxAgeDiff = coldStart ? 8 : 5;
  if (!isAgeDiffOk(a, b, maxAgeDiff)) return false;

  if (!coldStart && !isSameCity(a, b)) return false;

  const pairKey = [a.userId, b.userId].sort().join(':');
  if (recentMatchPairs.has(pairKey)) return false;

  return true;
}

// ============ 打分公式 ============

function getDimScore(profile: MatchCandidate['profile'], dimId: string): DimensionData | null {
  return profile.dimensions?.[dimId] || null;
}

function complementaryScore(a: MatchCandidate, b: MatchCandidate): number {
  let total = 0;
  let weightSum = 0;

  for (const dim of DIMENSION_CONFIGS) {
    const aData = getDimScore(a.profile, dim.id);
    const bData = getDimScore(b.profile, dim.id);

    if (!aData || !bData || aData.confidence < 0.2 || bData.confidence < 0.2) continue;

    let dimScore: number;
    switch (dim.mode) {
      case 'similar':
        dimScore = 1 - Math.abs(aData.score - bData.score);
        break;
      case 'complementary':
        dimScore = Math.abs(aData.score - bData.score);
        break;
      case 'mixed':
        // 60% similar + 40% complementary
        dimScore = 0.6 * (1 - Math.abs(aData.score - bData.score)) +
                   0.4 * Math.abs(aData.score - bData.score);
        break;
    }

    total += dim.weight * dimScore;
    weightSum += dim.weight;
  }

  return weightSum > 0 ? total / weightSum : 0.5;
}

function interestOverlap(a: MatchCandidate, b: MatchCandidate): number {
  const aInterest = getDimScore(a.profile, 'interest_map');
  const bInterest = getDimScore(b.profile, 'interest_map');

  if (!aInterest?.evidence?.length || !bInterest?.evidence?.length) return 0.5;

  const aLabels = new Set(aInterest.evidence.map(e => e.text.toLowerCase()));
  const bLabels = new Set(bInterest.evidence.map(e => e.text.toLowerCase()));

  if (aLabels.size === 0 && bLabels.size === 0) return 0.5;

  const intersection = [...aLabels].filter(l => bLabels.has(l)).length;
  const union = new Set([...aLabels, ...bLabels]).size;

  return union > 0 ? intersection / union : 0.5;
}

function stageFit(a: MatchCandidate, b: MatchCandidate): number {
  const aMarriage = getDimScore(a.profile, 'marriage_orientation');
  const bMarriage = getDimScore(b.profile, 'marriage_orientation');

  if (!aMarriage || !bMarriage) return 0.5;

  return 1 - Math.abs(aMarriage.score - bMarriage.score);
}

function activityBonus(a: MatchCandidate, b: MatchCandidate): number {
  return Math.min(a.activityScore, b.activityScore);
}

export function computeMatchScore(a: MatchCandidate, b: MatchCandidate): number {
  const cs = complementaryScore(a, b);
  const io = interestOverlap(a, b);
  const sf = stageFit(a, b);
  const ab = activityBonus(a, b);

  const raw =
    SCORE_WEIGHTS.complementary * cs +
    SCORE_WEIGHTS.interestOverlap * io +
    SCORE_WEIGHTS.stageFit * sf +
    SCORE_WEIGHTS.activityBonus * ab;

  return Math.round(raw * 100);
}

// ============ 贪心配对 ============

export function greedyPairing(
  candidates: MatchCandidate[],
  recentMatchPairs: Set<string>,
  coldStart: boolean,
): MatchPair[] {
  const pairs: { a: MatchCandidate; b: MatchCandidate; score: number }[] = [];

  for (let i = 0; i < candidates.length; i++) {
    for (let j = i + 1; j < candidates.length; j++) {
      if (!filterCandidatePair(candidates[i], candidates[j], recentMatchPairs, coldStart)) continue;
      const score = computeMatchScore(candidates[i], candidates[j]);
      pairs.push({ a: candidates[i], b: candidates[j], score });
    }
  }

  pairs.sort((x, y) => y.score - x.score);

  const matched = new Set<string>();
  const result: MatchPair[] = [];

  for (const p of pairs) {
    if (matched.has(p.a.userId) || matched.has(p.b.userId)) continue;
    matched.add(p.a.userId);
    matched.add(p.b.userId);
    result.push({ userA: p.a, userB: p.b, score: p.score });
  }

  // Cold start: ensure every unmatched user gets paired with best remaining option
  if (coldStart) {
    const unmatched = candidates.filter(c => !matched.has(c.userId));
    for (let i = 0; i < unmatched.length - 1; i += 2) {
      const score = computeMatchScore(unmatched[i], unmatched[i + 1]);
      result.push({ userA: unmatched[i], userB: unmatched[i + 1], score });
    }
  }

  return result;
}

export function isColdStart(totalActiveUsers: number): boolean {
  return totalActiveUsers < COLD_START_THRESHOLD;
}
