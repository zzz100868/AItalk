import WebSocket from 'ws';
import { SessionState, ClientMessage, ServerMessage } from './types';
import { AsrService } from './asr.service';
import { TtsService } from './tts.service';
import { DialogueService } from './dialogue.service';
import { CONFIG } from './config';

export class VoiceSession {
  private state: SessionState = SessionState.OPENING;
  private ws: WebSocket;
  private userId: string;
  private sessionId: string | null = null;

  private asr: AsrService;
  private tts: TtsService;
  private dialogue: DialogueService;

  private startTime: number = 0;
  private maxDuration: number = CONFIG.maxDurationSec * 1000;
  private durationTimer: NodeJS.Timeout | null = null;
  private softCloseTimer: NodeJS.Timeout | null = null;

  constructor(ws: WebSocket, userId: string) {
    this.ws = ws;
    this.userId = userId;
    this.asr = new AsrService();
    this.tts = new TtsService();
    this.dialogue = new DialogueService(userId);

    this.setupAsrListeners();
    this.setupTtsListeners();
  }

  async handleMessage(raw: string): Promise<void> {
    let msg: ClientMessage;
    try {
      msg = JSON.parse(raw);
    } catch {
      this.send({ type: 'error', code: 'INVALID_JSON', message: 'Invalid message format' });
      return;
    }

    switch (msg.type) {
      case 'start':
        await this.handleStart();
        break;
      case 'audio_chunk':
        this.handleAudioChunk(msg.pcmBase64);
        break;
      case 'extend':
        this.handleExtend();
        break;
      case 'end':
        await this.handleEnd();
        break;
      default:
        this.send({ type: 'error', code: 'UNKNOWN_TYPE', message: `Unknown message type` });
    }
  }

  async cleanup(): Promise<void> {
    this.asr.stop();
    this.tts.cancel();
    this.clearTimers();

    if (this.state !== SessionState.ENDED) {
      const duration = this.startTime ? Math.floor((Date.now() - this.startTime) / 1000) : 0;
      await this.dialogue.endSession(duration);
      this.state = SessionState.ENDED;
    }
  }

  // ============ Message Handlers ============

  private async handleStart(): Promise<void> {
    try {
      this.sessionId = await this.dialogue.init();
    } catch (e: any) {
      console.error(`[Session] Failed to init dialogue: ${e.message}`);
      this.sessionId = `mock-${Date.now()}`;
    }

    this.send({ type: 'connected', sessionId: this.sessionId });

    this.startTime = Date.now();
    this.startTimers();

    // AI opening line
    const opening = this.dialogue.getOpeningLine();
    this.state = SessionState.TTS_STREAMING;

    // In mock mode (no TTS), just send the text as ai_turn_end
    this.send({ type: 'ai_reply_audio', seq: 0, pcmBase64: '', text: opening });

    await this.tts.synthesize(opening);
    // tts 'done' event will transition to LISTENING
  }

  private handleAudioChunk(pcmBase64: string): void {
    if (this.state === SessionState.ENDED || this.state === SessionState.CLOSING) return;

    // Barge-in: if AI is speaking and user starts talking, stop TTS
    if (this.state === SessionState.TTS_STREAMING) {
      this.tts.cancel();
      this.send({ type: 'ai_turn_end' });
    }

    this.state = SessionState.ASR_STREAMING;
    const buffer = Buffer.from(pcmBase64, 'base64');
    this.asr.feedAudio(buffer);
  }

  private handleExtend(): void {
    const elapsed = Date.now() - this.startTime;
    const newMax = Math.min(elapsed + CONFIG.extendDurationSec * 1000, CONFIG.absoluteMaxSec * 1000);
    this.maxDuration = newMax;
    this.clearTimers();
    this.startTimers();
    console.log(`[Session] Extended to ${Math.floor(newMax / 1000)}s`);
  }

  private async handleEnd(): Promise<void> {
    this.state = SessionState.CLOSING;
    this.asr.stop();
    this.tts.cancel();
    this.clearTimers();

    const duration = Math.floor((Date.now() - this.startTime) / 1000);
    await this.dialogue.endSession(duration);

    this.send({
      type: 'session_end',
      duration,
      summary: `通话时长 ${Math.floor(duration / 60)} 分钟`,
    });
    this.state = SessionState.ENDED;
  }

  // ============ ASR/TTS Listeners ============

  private setupAsrListeners(): void {
    this.asr.on('partial', (text: string) => {
      this.send({ type: 'asr_partial', text });
    });

    this.asr.on('final', async (text: string) => {
      this.send({ type: 'asr_final', text });
      this.state = SessionState.THINKING;

      // Generate AI reply
      const reply = await this.dialogue.generateReply(text);

      // Check if session should close
      if (this.shouldSoftClose()) {
        this.state = SessionState.CLOSING;
        this.send({ type: 'session_soft_close', reason: '通话时间快到了，我们来收尾吧' });
      }

      // TTS the reply
      this.state = SessionState.TTS_STREAMING;
      this.send({ type: 'ai_reply_audio', seq: 0, pcmBase64: '', text: reply });
      await this.tts.synthesize(reply);
    });

    this.asr.on('error', (err: Error) => {
      console.error(`[Session] ASR error: ${err.message}`);
      this.send({ type: 'error', code: 'ASR_ERROR', message: err.message });
    });
  }

  private setupTtsListeners(): void {
    this.tts.on('audio', (pcmBase64: string, seq: number) => {
      this.send({ type: 'ai_reply_audio', seq, pcmBase64, text: '' });
    });

    this.tts.on('done', () => {
      this.send({ type: 'ai_turn_end' });

      if (this.state === SessionState.CLOSING) {
        this.handleEnd();
      } else {
        this.state = SessionState.LISTENING;
        this.asr.start();
      }
    });

    this.tts.on('error', (err: Error) => {
      console.error(`[Session] TTS error: ${err.message}`);
      this.send({ type: 'ai_turn_end' });
      this.state = SessionState.LISTENING;
      this.asr.start();
    });
  }

  // ============ Timer Management ============

  private startTimers(): void {
    const elapsed = Date.now() - this.startTime;
    const remaining = this.maxDuration - elapsed;

    // Hard close at max duration
    this.durationTimer = setTimeout(() => {
      this.handleEnd();
    }, remaining);

    // Soft close warning at 13 min mark
    const softCloseAt = CONFIG.softCloseSec * 1000 - elapsed;
    if (softCloseAt > 0) {
      this.softCloseTimer = setTimeout(() => {
        if (this.state !== SessionState.ENDED && this.state !== SessionState.CLOSING) {
          this.send({ type: 'session_soft_close', reason: '通话快到 15 分钟了' });
        }
      }, softCloseAt);
    }
  }

  private clearTimers(): void {
    if (this.durationTimer) {
      clearTimeout(this.durationTimer);
      this.durationTimer = null;
    }
    if (this.softCloseTimer) {
      clearTimeout(this.softCloseTimer);
      this.softCloseTimer = null;
    }
  }

  private shouldSoftClose(): boolean {
    const elapsed = (Date.now() - this.startTime) / 1000;
    return elapsed >= CONFIG.softCloseSec;
  }

  // ============ Helpers ============

  private send(msg: ServerMessage): void {
    if (this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }
}
