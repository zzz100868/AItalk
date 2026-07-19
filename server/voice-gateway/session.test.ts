import assert from 'node:assert/strict';
import test from 'node:test';
import { EventEmitter } from 'node:events';
import WebSocket from 'ws';
import { SessionEndReason, ServerMessage } from './types';
import { VoiceSession, VoiceSessionClock, VoiceSessionDependencies } from './session';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

async function flushAsync(): Promise<void> {
  await new Promise<void>((resolve) => setImmediate(resolve));
  await new Promise<void>((resolve) => setImmediate(resolve));
}

class FakeClock implements VoiceSessionClock {
  private currentMs: number;
  private nextId = 1;
  private readonly tasks = new Map<number, { at: number; callback: () => void }>();

  constructor(startMs: number) {
    this.currentMs = startMs;
  }

  now(): number {
    return this.currentMs;
  }

  setTimeout(callback: () => void, delayMs: number): number {
    const id = this.nextId++;
    this.tasks.set(id, { at: this.currentMs + Math.max(0, delayMs), callback });
    return id;
  }

  clearTimeout(handle: unknown): void {
    this.tasks.delete(handle as number);
  }

  async advanceBy(ms: number): Promise<void> {
    const target = this.currentMs + ms;

    while (true) {
      const next = [...this.tasks.entries()]
        .filter(([, task]) => task.at <= target)
        .sort((left, right) => left[1].at - right[1].at || left[0] - right[0])[0];
      if (!next) break;

      const [id, task] = next;
      this.tasks.delete(id);
      this.currentMs = task.at;
      task.callback();
      await flushAsync();
    }

    this.currentMs = target;
    await flushAsync();
  }
}

class FakeSocket {
  readyState = WebSocket.OPEN;
  readonly messages: ServerMessage[] = [];

  send(raw: string): void {
    this.messages.push(JSON.parse(raw) as ServerMessage);
  }
}

class FakeAsr extends EventEmitter {
  startCalls = 0;
  stopCalls = 0;

  start(): void {
    this.startCalls += 1;
  }

  stop(): void {
    this.stopCalls += 1;
  }

  feedAudio(_pcmBuffer: Buffer): void {}
}

class FakeTts extends EventEmitter {
  readonly synthesized: string[] = [];
  cancelCalls = 0;
  synthesizeResult: Promise<void> = Promise.resolve();

  async synthesize(text: string): Promise<void> {
    this.synthesized.push(text);
    await this.synthesizeResult;
  }

  cancel(): void {
    this.cancelCalls += 1;
  }
}

class FakeDialogue {
  initCalls = 0;
  endCalls: Array<{ durationSec: number; reason: SessionEndReason }> = [];
  initResult: Promise<string> = Promise.resolve('session-1');
  replyResult: Promise<string> = Promise.resolve('reply');
  endResult: Promise<void> = Promise.resolve();
  awaitingClosing = false;
  closingComplete = false;

  async init(): Promise<string> {
    this.initCalls += 1;
    return this.initResult;
  }

  getOpeningLine(): string {
    return 'opening';
  }

  async generateReply(): Promise<string> {
    return this.replyResult;
  }

  async endSession(durationSec: number, reason: SessionEndReason): Promise<void> {
    this.endCalls.push({ durationSec, reason });
    await this.endResult;
  }

  isAwaitingClosing(): boolean {
    return this.awaitingClosing;
  }

  isClosingComplete(): boolean {
    return this.closingComplete;
  }
}

function createFixture(
  dialogue = new FakeDialogue(),
  dependencies: Pick<VoiceSessionDependencies, 'clock' | 'timing'> = {},
) {
  const socket = new FakeSocket();
  const asr = new FakeAsr();
  const tts = new FakeTts();
  const session = new VoiceSession(socket as unknown as WebSocket, 'user-1', {
    ...dependencies,
    asr,
    tts,
    dialogue,
  });
  return { session, socket, asr, tts, dialogue };
}

test('concurrent duplicate start initializes and announces one session', async () => {
  const init = deferred<string>();
  const dialogue = new FakeDialogue();
  dialogue.initResult = init.promise;
  const fixture = createFixture(dialogue);

  const firstStart = fixture.session.handleMessage(JSON.stringify({ type: 'start' }));
  const secondStart = fixture.session.handleMessage(JSON.stringify({ type: 'start' }));

  assert.equal(dialogue.initCalls, 1);
  init.resolve('session-1');
  await Promise.all([firstStart, secondStart]);

  assert.equal(fixture.socket.messages.filter((message) => message.type === 'connected').length, 1);
  assert.deepEqual(fixture.tts.synthesized, ['opening']);

  await fixture.session.cleanup();
});

test('a normal voice turn reaches a single user-ended terminal event', async () => {
  const fixture = createFixture();

  await fixture.session.handleMessage(JSON.stringify({ type: 'start' }));
  fixture.tts.emit('done');
  await fixture.session.handleMessage(JSON.stringify({ type: 'listen_ready' }));
  fixture.asr.emit('ready');
  fixture.asr.emit('final', 'hello', 0.9);
  await flushAsync();
  fixture.tts.emit('done');
  await fixture.session.handleMessage(JSON.stringify({ type: 'end' }));

  assert.deepEqual(
    fixture.socket.messages.map((message) => message.type),
    [
      'connected',
      'ai_reply_audio',
      'ai_turn_end',
      'asr_ready',
      'asr_final',
      'ai_reply_audio',
      'ai_turn_end',
      'session_end',
    ],
  );
  assert.deepEqual(fixture.dialogue.endCalls.map((call) => call.reason), ['user_ended']);
});

test('concurrent end and cleanup calls share one terminal transition', async () => {
  const end = deferred<void>();
  const dialogue = new FakeDialogue();
  dialogue.endResult = end.promise;
  const fixture = createFixture(dialogue);
  await fixture.session.handleMessage(JSON.stringify({ type: 'start' }));

  const clientEnd = fixture.session.handleMessage(JSON.stringify({ type: 'end' }));
  const duplicateEnd = fixture.session.handleMessage(JSON.stringify({ type: 'end' }));
  const socketClose = fixture.session.cleanup();
  const socketError = fixture.session.cleanup();
  await flushAsync();
  const callsBeforeCompletion = dialogue.endCalls.length;

  end.resolve(undefined);
  await Promise.all([clientEnd, duplicateEnd, socketClose, socketError]);

  assert.equal(callsBeforeCompletion, 1);
  assert.deepEqual(dialogue.endCalls.map((call) => call.reason), ['user_ended']);
  assert.equal(fixture.socket.messages.filter((message) => message.type === 'session_end').length, 1);
});

test('late ASR, dialogue, and TTS callbacks cannot revive an ended session', async () => {
  const reply = deferred<string>();
  const dialogue = new FakeDialogue();
  dialogue.replyResult = reply.promise;
  const fixture = createFixture(dialogue);

  await fixture.session.handleMessage(JSON.stringify({ type: 'start' }));
  fixture.tts.emit('done');
  await fixture.session.handleMessage(JSON.stringify({ type: 'listen_ready' }));
  fixture.asr.emit('ready');
  fixture.asr.emit('final', 'pending question', 0.9);
  await flushAsync();
  await fixture.session.handleMessage(JSON.stringify({ type: 'end' }));
  const messagesAtEnd = fixture.socket.messages.map((message) => ({ ...message }));

  reply.resolve('late reply');
  await flushAsync();
  fixture.asr.emit('ready');
  fixture.asr.emit('partial', 'late partial', 0.8);
  fixture.asr.emit('final', 'late final', 0.8);
  fixture.asr.emit('error', new Error('late ASR error'));
  fixture.tts.emit('audio', 'bGF0ZQ==', 99);
  fixture.tts.emit('done');
  fixture.tts.emit('error', new Error('late TTS error'));
  await flushAsync();

  assert.deepEqual(fixture.socket.messages, messagesAtEnd);
  assert.equal(fixture.tts.synthesized.includes('late reply'), false);
  assert.equal(fixture.socket.messages.at(-1)?.type, 'session_end');
});

test('cleanup during initialization waits and closes the created session once', async () => {
  const init = deferred<string>();
  const dialogue = new FakeDialogue();
  dialogue.initResult = init.promise;
  const fixture = createFixture(dialogue);

  const start = fixture.session.handleMessage(JSON.stringify({ type: 'start' }));
  const cleanup = fixture.session.cleanup();
  const endCallsBeforeInit = dialogue.endCalls.length;

  init.resolve('session-1');
  await Promise.all([start, cleanup]);

  assert.equal(endCallsBeforeInit, 0);
  assert.deepEqual(dialogue.endCalls.map((call) => call.reason), ['abandoned']);
  assert.equal(fixture.socket.messages.length, 0);
});

test('ASR errors are reported and listening can be requested again', async () => {
  const fixture = createFixture();
  await fixture.session.handleMessage(JSON.stringify({ type: 'start' }));
  fixture.tts.emit('done');
  await fixture.session.handleMessage(JSON.stringify({ type: 'listen_ready' }));
  fixture.asr.emit('ready');

  fixture.asr.emit('error', new Error('ASR unavailable'));
  await fixture.session.handleMessage(JSON.stringify({ type: 'listen_ready' }));

  assert.deepEqual(
    fixture.socket.messages.filter((message) => message.type === 'error'),
    [{ type: 'error', code: 'ASR_ERROR', message: 'ASR unavailable' }],
  );
  assert.equal(fixture.asr.startCalls, 3);
  await fixture.session.cleanup();
});

test('TTS errors end one AI turn, report the failure, and allow listening', async () => {
  const fixture = createFixture();
  await fixture.session.handleMessage(JSON.stringify({ type: 'start' }));

  fixture.tts.emit('error', new Error('TTS unavailable'));
  fixture.tts.emit('error', new Error('duplicate TTS error'));
  await fixture.session.handleMessage(JSON.stringify({ type: 'listen_ready' }));
  await fixture.session.cleanup();

  assert.deepEqual(
    fixture.socket.messages.filter((message) => message.type === 'error'),
    [{ type: 'error', code: 'TTS_ERROR', message: 'TTS unavailable' }],
  );
  assert.equal(fixture.socket.messages.filter((message) => message.type === 'ai_turn_end').length, 1);
  assert.equal(fixture.asr.startCalls, 2);
});

test('active hangup completes without waiting for a pending TTS promise', async () => {
  const synthesis = deferred<void>();
  const fixture = createFixture();
  fixture.tts.synthesizeResult = synthesis.promise;

  const start = fixture.session.handleMessage(JSON.stringify({ type: 'start' }));
  await flushAsync();
  const end = fixture.session.handleMessage(JSON.stringify({ type: 'end' }));
  await flushAsync();
  const endedBeforeTtsSettled = fixture.socket.messages.at(-1)?.type === 'session_end';

  synthesis.resolve(undefined);
  await Promise.all([start, end]);

  assert.equal(endedBeforeTtsSettled, true);
  assert.deepEqual(fixture.dialogue.endCalls.map((call) => call.reason), ['user_ended']);
});

test('soft close, extend, and hard timeout have deterministic boundaries', async () => {
  const clock = new FakeClock(1_000);
  const fixture = createFixture(new FakeDialogue(), {
    clock,
    timing: {
      maxDurationMs: 100,
      softCloseMs: 80,
      extendDurationMs: 50,
      absoluteMaxMs: 150,
      speechEndMs: 10,
    },
  });
  await fixture.session.handleMessage(JSON.stringify({ type: 'start' }));
  fixture.tts.emit('done');

  await clock.advanceBy(79);
  assert.equal(fixture.socket.messages.some((message) => message.type === 'session_soft_close'), false);
  await clock.advanceBy(1);
  assert.equal(fixture.socket.messages.filter((message) => message.type === 'session_soft_close').length, 1);

  await fixture.session.handleMessage(JSON.stringify({ type: 'extend' }));
  await clock.advanceBy(49);
  assert.equal(fixture.socket.messages.some((message) => message.type === 'session_end'), false);
  await clock.advanceBy(1);
  const endedAtShortenedDeadline = fixture.socket.messages.some((message) => message.type === 'session_end');
  await clock.advanceBy(20);

  assert.equal(endedAtShortenedDeadline, false);
  assert.deepEqual(fixture.dialogue.endCalls.map((call) => call.reason), ['timeout_ended']);
  assert.equal(fixture.socket.messages.filter((message) => message.type === 'session_end').length, 1);
  assert.equal(
    fixture.socket.messages.find((message) => message.type === 'session_end')?.endReason,
    'timeout_ended',
  );
});
