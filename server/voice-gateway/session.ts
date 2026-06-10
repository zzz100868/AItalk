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
  private ttsCompleted = false;
  private asrReady = false;
  private closeAfterTts = false;
  private latestAsrText = '';
  private speechDetected = false;
  private speechEndTimer: NodeJS.Timeout | null = null;
  private finalizingUserSpeech = false;

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
      case 'listen_ready':
        this.handleListenReady();
        break;
      case 'end':
        await this.handleEnd();
        break;
      default:
        this.send({ type: 'error', code: 'UNKNOWN_TYPE', message: `Unknown message type` });
    }
  }

  async cleanup(): Promise<void> {
    this.asrReady = false;
    this.closeAfterTts = false;
    this.resetAsrTurn();
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

    this.ttsCompleted = false;
    await this.tts.synthesize(opening);
    // tts 'done' event will transition to LISTENING
  }

  private handleAudioChunk(pcmBase64: string): void {
    if (this.state === SessionState.ENDED || this.state === SessionState.CLOSING) return;

    if (!this.asrReady) return;
    if (this.state !== SessionState.LISTENING && this.state !== SessionState.ASR_STREAMING) return;

    this.state = SessionState.ASR_STREAMING;
    const buffer = Buffer.from(pcmBase64, 'base64');
    if (this.isSpeechFrame(buffer)) {
      this.speechDetected = true;
      this.clearSpeechEndTimer();
    } else if (this.speechDetected && !this.speechEndTimer) {
      this.speechEndTimer = setTimeout(() => {
        this.finalizeUserSpeech();
      }, 1200);
    }
    this.asr.feedAudio(buffer);
  }

  private handleListenReady(): void {
    if (this.state === SessionState.ENDED || this.state === SessionState.CLOSING) return;
    if (this.state !== SessionState.WAITING_TO_LISTEN && this.state !== SessionState.OPENING) return;

    this.state = SessionState.ASR_CONNECTING;
    this.asrReady = false;
    this.resetAsrTurn();
    this.asr.start();
  }

  private isSpeechFrame(buffer: Buffer): boolean {
    const sampleCount = Math.floor(buffer.length / 2);
    if (sampleCount === 0) return false;

    let peak = 0;
    let sumSquares = 0;
    for (let i = 0; i < sampleCount; i++) {
      const sample = buffer.readInt16LE(i * 2);
      const abs = Math.abs(sample);
      if (abs > peak) peak = abs;
      sumSquares += sample * sample;
    }

    const rmsRatio = Math.sqrt(sumSquares / sampleCount) / 32768;
    const peakRatio = peak / 32768;
    return rmsRatio > 0.01 || peakRatio > 0.08;
  }

  private clearSpeechEndTimer(): void {
    if (this.speechEndTimer) {
      clearTimeout(this.speechEndTimer);
      this.speechEndTimer = null;
    }
  }

  private resetAsrTurn(): void {
    this.clearSpeechEndTimer();
    this.latestAsrText = '';
    this.speechDetected = false;
    this.finalizingUserSpeech = false;
  }

  private async finalizeUserSpeech(textOverride?: string): Promise<void> {
    if (this.finalizingUserSpeech || this.state === SessionState.ENDED || this.state === SessionState.CLOSING) return;

    this.clearSpeechEndTimer();
    const text = (textOverride || this.latestAsrText).trim();
    if (!text) {
      this.speechDetected = false;
      return;
    }

    this.finalizingUserSpeech = true;
    this.asrReady = false;
    this.asr.stop();
    this.send({ type: 'asr_final', text });
    this.state = SessionState.THINKING;

    const reply = await this.dialogue.generateReply(text);

    if (this.shouldSoftClose()) {
      this.closeAfterTts = true;
      this.send({ type: 'session_soft_close', reason: '閫氳瘽鏃堕棿蹇埌浜嗭紝鎴戜滑鏉ユ敹灏惧惂' });
    }

    this.state = SessionState.TTS_STREAMING;
    this.send({ type: 'ai_reply_audio', seq: 0, pcmBase64: '', text: reply });
    this.ttsCompleted = false;
    await this.tts.synthesize(reply);
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
    if (this.state === SessionState.ENDED) return;

    this.state = SessionState.CLOSING;
    this.asrReady = false;
    this.closeAfterTts = false;
    this.resetAsrTurn();
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
    this.asr.on('ready', () => {
      if (this.state === SessionState.ENDED || this.state === SessionState.CLOSING) return;

      this.asrReady = true;
      this.state = SessionState.LISTENING;
      this.send({ type: 'asr_ready' });
    });

    this.asr.on('partial', (text: string) => {
      this.latestAsrText = text;
      this.send({ type: 'asr_partial', text });
    });

    this.asr.on('final', async (text: string) => {
      await this.finalizeUserSpeech(text);
      return;
      if (this.state === SessionState.ENDED || this.state === SessionState.CLOSING) return;

      this.asrReady = false;
      this.asr.stop();
      this.send({ type: 'asr_final', text });
      this.state = SessionState.THINKING;

      // Generate AI reply
      const reply = await this.dialogue.generateReply(text);

      // Check if session should close
      if (this.shouldSoftClose()) {
        this.closeAfterTts = true;
        this.send({ type: 'session_soft_close', reason: '通话时间快到了，我们来收尾吧' });
      }

      // TTS the reply
      this.state = SessionState.TTS_STREAMING;
      this.send({ type: 'ai_reply_audio', seq: 0, pcmBase64: '', text: reply });
      this.ttsCompleted = false;
      await this.tts.synthesize(reply);
    });

    this.asr.on('error', (err: Error) => {
      this.asrReady = false;
      if (this.state !== SessionState.ENDED && this.state !== SessionState.CLOSING) {
        this.state = SessionState.WAITING_TO_LISTEN;
      }
      console.error(`[Session] ASR error: ${err.message}`);
      this.send({ type: 'error', code: 'ASR_ERROR', message: err.message });
    });
  }

  private setupTtsListeners(): void {
    this.tts.on('audio', (pcmBase64: string, seq: number, audioFormat = 'pcm', sampleRate = CONFIG.volcTtsSampleRate) => {
      this.send({ type: 'ai_reply_audio', seq, pcmBase64, text: '', audioFormat, sampleRate });
    });

    this.tts.on('done', () => {
      if (this.ttsCompleted) return;
      this.ttsCompleted = true;
      this.send({ type: 'ai_turn_end' });

      if (this.closeAfterTts || this.state === SessionState.CLOSING) {
        this.closeAfterTts = false;
        this.handleEnd();
        return;
      }

      this.state = SessionState.WAITING_TO_LISTEN;
      this.asrReady = false;
    });

    this.tts.on('error', (err: Error) => {
      console.error(`[Session] TTS error: ${err.message}`);
      if (this.ttsCompleted) return;
      this.ttsCompleted = true;
      this.send({ type: 'ai_turn_end' });
      if (this.closeAfterTts || this.state === SessionState.CLOSING) {
        this.closeAfterTts = false;
        this.handleEnd();
        return;
      }

      this.state = SessionState.WAITING_TO_LISTEN;
      this.asrReady = false;
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
