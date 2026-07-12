import assert from 'node:assert/strict';
import test from 'node:test';
import {
  analyzeAnswer,
  applyAnswerToCoverage,
  applyCorrectionToCoverage,
  createCoverageState,
  createEvidenceDrafts,
  selectCandidateCards,
} from './coverage-engine';
import { DIMENSION_IDS } from './profiling.types';
import { PROBE_CARDS } from './probe-cards';

test('probe catalog stays within MVP size and covers all dimensions', () => {
  assert.ok(PROBE_CARDS.length >= 25 && PROBE_CARDS.length <= 35);
  const covered = new Set(PROBE_CARDS.flatMap((card) => card.targetDimensions));
  assert.deepEqual([...DIMENSION_IDS].sort(), [...covered].sort());

  for (const card of PROBE_CARDS) {
    assert.ok(card.options.length >= 3 && card.options.length <= 4, card.id);
    assert.ok(card.sourceQuestionIds.length > 0, card.id);
    assert.ok(card.options.every((option) => option.signals.length > 0), card.id);
  }
});

test('stage routing actively includes D10 in the social window', () => {
  const state = createCoverageState();
  const candidates = selectCandidateCards(state, 650, 4);
  assert.ok(candidates.every((card) => card.stage === 'social'));
  assert.ok(candidates.some((card) => card.targetDimensions.includes('social_stance')));
});

test('a choice creates traceable weak evidence and advances coverage', () => {
  const state = createCoverageState();
  const card = PROBE_CARDS.find((item) => item.id === 'warmup_day_rhythm')!;
  const analysis = analyzeAnswer(card, '我选B，平时就是夜猫子', 0);
  const drafts = createEvidenceDrafts(card, '我选B，平时就是夜猫子', analysis);
  const next = applyAnswerToCoverage(state, card, analysis, drafts, 'session-1');

  assert.equal(analysis.optionId, 'B');
  assert.equal(drafts[0].sourceQuestionIds[0], 'Q39');
  assert.equal(next.dimensions.life_rhythm.status, 'weak');
  assert.equal(next.dimensions.life_rhythm.evidenceCount, 1);
});

test('explicit answer text wins over an incorrect LLM classification', () => {
  const card = PROBE_CARDS.find((item) => item.id === 'warmup_day_rhythm')!;
  const analysis = analyzeAnswer(card, '我选B，我一直都是夜猫子', 0, 'A');
  assert.equal(analysis.optionId, 'B');
});

test('low ASR confidence caps evidence strength at 0.10', () => {
  const card = PROBE_CARDS.find((item) => item.id === 'warmup_day_rhythm')!;
  const analysis = analyzeAnswer(card, '我选B，因为我每天都很晚睡', 0, undefined, undefined, 0.55);
  assert.equal(analysis.confidenceDelta, 0.1);
});

test('a short unmapped answer gets one follow-up only', () => {
  const card = PROBE_CARDS[0];
  const first = analyzeAnswer(card, '都还好', 0);
  const second = analyzeAnswer(card, '都还好', 1);
  assert.equal(first.needsFollowUp, true);
  assert.equal(second.needsFollowUp, false);
});

test('skip suppresses the same dimensions for the rest of the session', () => {
  const state = createCoverageState();
  const card = PROBE_CARDS.find((item) => item.id === 'relationship_children')!;
  const analysis = analyzeAnswer(card, '这个不想聊，跳过', 0);
  const next = applyAnswerToCoverage(state, card, analysis, [], 'session-1');
  const candidates = selectCandidateCards(next, 420, PROBE_CARDS.length);

  assert.equal(next.dimensions.family_model.status, 'skipped');
  assert.ok(candidates.every((item) => !item.targetDimensions.includes('family_model')));
  assert.ok(candidates.every((item) => !item.targetDimensions.includes('marriage_orientation')));
});

test('correction is strong evidence and marks existing coverage for recheck', () => {
  const state = createCoverageState();
  state.dimensions.life_rhythm = { confidence: 0.2, evidenceCount: 1, status: 'weak' };
  state.activeCardId = 'warmup_weekend';
  const card = PROBE_CARDS.find((item) => item.id === 'warmup_day_rhythm')!;
  const analysis = analyzeAnswer(card, '不是，我刚才说的是A，我其实一直早起', 0);
  const drafts = createEvidenceDrafts(card, '不是，我刚才说的是A，我其实一直早起', analysis);
  const next = applyCorrectionToCoverage(state, card, drafts);

  assert.equal(analysis.confidenceDelta, 0.3);
  assert.equal(next.dimensions.life_rhythm.status, 'needs_recheck');
  assert.equal(next.activeCardId, 'warmup_weekend');
});
