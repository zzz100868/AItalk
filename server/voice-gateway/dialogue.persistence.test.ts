import assert from 'node:assert/strict';
import test from 'node:test';
import type { PrismaClient } from '@prisma/client';
import type { DialogueService as DialogueServiceType } from './dialogue.service';
import { DIMENSION_IDS, type CoverageState } from './profiling.types';

const testDatabaseUrl = process.env.VOICE_TEST_DATABASE_URL;
if (!testDatabaseUrl) {
  throw new Error('VOICE_TEST_DATABASE_URL must point to a disposable PostgreSQL test database');
}
const testDatabaseName = decodeURIComponent(new URL(testDatabaseUrl).pathname.replace(/^\//u, ''));
if (!/test/iu.test(testDatabaseName)) {
  throw new Error('VOICE_TEST_DATABASE_URL database name must contain "test"');
}

process.env.DATABASE_URL = testDatabaseUrl;
process.env.VOLC_API_KEY = '';
process.env.VOLC_LLM_MODEL = '';

let prisma: PrismaClient;
let DialogueService: typeof DialogueServiceType;

async function resetVoiceData(): Promise<void> {
  await prisma.voiceEvidence.deleteMany();
  await prisma.dialogueTurn.deleteMany();
  await prisma.voiceSession.deleteMany();
  await prisma.voiceCoverageState.deleteMany();
  await prisma.profileDocument.deleteMany();
  await prisma.user.deleteMany({ where: { openid: { startsWith: 'voice-persistence-test-' } } });
}

async function createUser(label: string) {
  return prisma.user.create({
    data: {
      openid: `voice-persistence-test-${label}-${Date.now()}-${Math.random()}`,
      nickname: 'Voice persistence test',
    },
  });
}

test.before(async () => {
  ({ DialogueService } = await import('./dialogue.service'));
  ({ prisma } = await import('./prisma'));
  await prisma.$connect();
  await resetVoiceData();
});

test.beforeEach(async () => {
  await resetVoiceData();
});

test.after(async () => {
  await resetVoiceData();
  await prisma.$disconnect();
});

test('a successful answer persists turns, evidence, coverage, snapshot, and profile consistently', async () => {
  const user = await createUser('success');
  const dialogue = new DialogueService(user.id);
  const sessionId = await dialogue.init();

  await dialogue.generateReply('A，早睡早起', { elapsedSec: 30, asrConfidence: 0.95 });

  const [turns, evidence, coverageRow, session, profile] = await Promise.all([
    prisma.dialogueTurn.findMany({ where: { sessionId }, orderBy: { idx: 'asc' } }),
    prisma.voiceEvidence.findMany({ where: { sessionId }, orderBy: { createdAt: 'asc' } }),
    prisma.voiceCoverageState.findUniqueOrThrow({ where: { userId: user.id } }),
    prisma.voiceSession.findUniqueOrThrow({ where: { id: sessionId } }),
    prisma.profileDocument.findUniqueOrThrow({ where: { userId: user.id } }),
  ]);

  assert.deepEqual(turns.map((turn) => turn.role), ['ai', 'user', 'ai']);
  assert.ok(evidence.length > 0);
  assert.equal(evidence[0].turnId, turns[1].id);

  const coverage = coverageRow.data as unknown as CoverageState;
  assert.equal(coverage.lastEvidenceId, evidence.at(-1)?.id);
  assert.equal(coverage.dimensions[evidence[0].dimension as keyof CoverageState['dimensions']].evidenceCount, 1);
  assert.deepEqual(session.coverageSnapshot, coverageRow.data);

  const profileData = profile.data as Record<string, any>;
  const profileEvidence = profileData.dimensions[evidence[0].dimension].evidence;
  assert.ok(profileEvidence.some((item: { id: string }) => item.id === evidence[0].id));
});

test('a mid-round persistence failure rolls back every write from that answer', async () => {
  const user = await createUser('rollback');
  const dialogue = new DialogueService(user.id);
  const sessionId = await dialogue.init();
  const sessionBefore = await prisma.voiceSession.findUniqueOrThrow({ where: { id: sessionId } });
  const coverageBefore = await prisma.voiceCoverageState.findUniqueOrThrow({ where: { userId: user.id } });
  const invalidProfile = {
    dimensions: Object.fromEntries(
      DIMENSION_IDS.map((dimension) => [dimension, { label: 'invalid', confidence: 0, evidence: null }]),
    ),
  };
  await prisma.profileDocument.create({
    data: { userId: user.id, data: invalidProfile, version: 1 },
  });

  await assert.rejects(
    dialogue.generateReply('A，早睡早起', { elapsedSec: 30, asrConfidence: 0.95 }),
  );

  const [turns, evidence, coverage, profile, sessionAfter] = await Promise.all([
    prisma.dialogueTurn.findMany({ where: { sessionId }, orderBy: { idx: 'asc' } }),
    prisma.voiceEvidence.findMany({ where: { sessionId } }),
    prisma.voiceCoverageState.findUnique({ where: { userId: user.id } }),
    prisma.profileDocument.findUnique({ where: { userId: user.id } }),
    prisma.voiceSession.findUniqueOrThrow({ where: { id: sessionId } }),
  ]);

  assert.deepEqual(turns.map((turn) => turn.role), ['ai']);
  assert.equal(evidence.length, 0);
  assert.deepEqual(coverage?.data, coverageBefore.data);
  assert.deepEqual(profile?.data, invalidProfile);
  assert.deepEqual(sessionAfter.coverageSnapshot, sessionBefore.coverageSnapshot);
});

test('concurrent and repeated ending persists the first terminal reason once', async () => {
  const user = await createUser('duplicate-end');
  const dialogue = new DialogueService(user.id);
  const sessionId = await dialogue.init();

  await Promise.all([
    dialogue.endSession(31, 'user_ended'),
    dialogue.endSession(99, 'timeout_ended'),
    dialogue.endSession(45, 'abandoned'),
  ]);
  await dialogue.endSession(120, 'completed');

  const [session, coverage] = await Promise.all([
    prisma.voiceSession.findUniqueOrThrow({ where: { id: sessionId } }),
    prisma.voiceCoverageState.findUniqueOrThrow({ where: { userId: user.id } }),
  ]);

  assert.equal(session.status, 'ended');
  assert.equal(session.endReason, 'user_ended');
  assert.equal(session.durationSec, 31);
  assert.ok(session.endedAt);
  assert.equal(coverage.version, 2);
  assert.deepEqual(session.coverageSnapshot, coverage.data);
});

test('a correction supersedes prior evidence and updates coverage and profile together', async () => {
  const user = await createUser('correction');
  const dialogue = new DialogueService(user.id);
  const sessionId = await dialogue.init();

  await dialogue.generateReply('A，早睡早起', { elapsedSec: 30, asrConfidence: 0.95 });
  const original = await prisma.voiceEvidence.findMany({
    where: { sessionId, status: 'active' },
    orderBy: { createdAt: 'asc' },
  });
  assert.ok(original.length > 0);

  await dialogue.generateReply('我纠正一下，我刚才说的是 B，晚睡晚起', {
    elapsedSec: 60,
    asrConfidence: 0.95,
  });

  const [evidence, coverageRow, profile] = await Promise.all([
    prisma.voiceEvidence.findMany({ where: { sessionId }, orderBy: { createdAt: 'asc' } }),
    prisma.voiceCoverageState.findUniqueOrThrow({ where: { userId: user.id } }),
    prisma.profileDocument.findUniqueOrThrow({ where: { userId: user.id } }),
  ]);
  const corrected = evidence.filter((item) => item.supersedesEvidenceId !== null);

  assert.equal(corrected.length, original.length);
  for (const prior of original) {
    assert.equal(evidence.find((item) => item.id === prior.id)?.status, 'superseded');
    const replacement = corrected.find((item) => item.supersedesEvidenceId === prior.id);
    assert.ok(replacement);
    assert.equal(replacement.dimension, prior.dimension);
    assert.equal(replacement.status, 'active');
    assert.equal(replacement.optionId, 'B');
  }

  const coverage = coverageRow.data as unknown as CoverageState;
  assert.ok(corrected.some((item) => item.id === coverage.lastEvidenceId));
  for (const replacement of corrected) {
    const dimension = replacement.dimension as keyof CoverageState['dimensions'];
    assert.equal(coverage.dimensions[dimension].status, 'needs_recheck');
    assert.equal(coverage.dimensions[dimension].evidenceCount, 2);
  }

  const profileData = profile.data as Record<string, any>;
  for (const replacement of corrected) {
    const profileEvidence = profileData.dimensions[replacement.dimension].evidence;
    assert.equal(
      profileEvidence.find((item: { id: string }) => item.id === replacement.supersedesEvidenceId)?.status,
      'superseded',
    );
    assert.equal(profileEvidence.find((item: { id: string }) => item.id === replacement.id)?.status, 'active');
  }
});

test('an abandoned session keeps committed progress and the next session resumes it', async () => {
  const user = await createUser('abandoned');
  const firstDialogue = new DialogueService(user.id);
  const firstSessionId = await firstDialogue.init();
  await firstDialogue.generateReply('A，我更喜欢这种方式', { elapsedSec: 30, asrConfidence: 0.95 });

  await firstDialogue.endSession(47, 'abandoned');

  const [endedSession, savedCoverage, committedEvidence] = await Promise.all([
    prisma.voiceSession.findUniqueOrThrow({ where: { id: firstSessionId } }),
    prisma.voiceCoverageState.findUniqueOrThrow({ where: { userId: user.id } }),
    prisma.voiceEvidence.findMany({ where: { sessionId: firstSessionId } }),
  ]);
  assert.equal(endedSession.status, 'ended');
  assert.equal(endedSession.endReason, 'abandoned');
  assert.equal(endedSession.durationSec, 47);
  assert.deepEqual(endedSession.coverageSnapshot, savedCoverage.data);
  assert.ok(committedEvidence.length > 0);

  const secondDialogue = new DialogueService(user.id);
  const secondSessionId = await secondDialogue.init();
  const secondSession = await prisma.voiceSession.findUniqueOrThrow({ where: { id: secondSessionId } });
  const secondCoverage = secondSession.coverageSnapshot as unknown as CoverageState;

  assert.equal(secondSession.roundNo, 2);
  assert.ok(secondCoverage.lastEvidenceId);
  assert.ok(committedEvidence.some((item) => item.id === secondCoverage.lastEvidenceId));
});
