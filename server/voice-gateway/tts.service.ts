import { EventEmitter } from 'events';
import WebSocket from 'ws';
import { isTtsConfigured, CONFIG } from './config';

enum TtsEvent {
  START_CONNECTION = 1,
  FINISH_CONNECTION = 2,
  CONNECTION_STARTED = 50,
  CONNECTION_FAILED = 51,
  CONNECTION_FINISHED = 52,
  START_SESSION = 100,
  CANCEL_SESSION = 101,
  FINISH_SESSION = 102,
  SESSION_STARTED = 150,
  SESSION_CANCELED = 151,
  SESSION_FINISHED = 152,
  SESSION_FAILED = 153,
  TASK_REQUEST = 200,
  TTS_SENTENCE_START = 350,
  TTS_SENTENCE_END = 351,
  TTS_RESPONSE = 352,
}

type TtsAudioFormat = 'pcm' | 'mp3' | 'ogg_opus' | 'wav' | 'unknown';

/**
 * 构建 TTS 帧：Header(4) + Event(int32 BE) + [SubFieldSize(uint32) + SubFieldData]...
 * Full-client request (0b0001) + with event flag (0b0100), JSON, no compression
 */
function buildFrame(event: TtsEvent, parts: { data: Buffer }[]): Buffer {
  const header = Buffer.alloc(4);
  header[0] = (0b0001 << 4) | 0b0001; // version=1, header_size=1
  header[1] = (0b0001 << 4) | 0b0100; // Full-client request + with event
  header[2] = (0b0001 << 4) | 0b0000; // JSON + no compression
  header[3] = 0x00;

  const eventBuf = Buffer.alloc(4);
  eventBuf.writeInt32BE(event, 0);

  const partsBuf = Buffer.concat(
    parts.map((p) => {
      const sb = Buffer.alloc(4);
      sb.writeUInt32BE(p.data.length, 0);
      return Buffer.concat([sb, p.data]);
    }),
  );

  return Buffer.concat([header, eventBuf, partsBuf]);
}

function uuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function detectAudioFormat(data: Buffer): TtsAudioFormat {
  if (data.length >= 4 && data.subarray(0, 4).toString('ascii') === 'RIFF') return 'wav';
  if (data.length >= 4 && data.subarray(0, 4).toString('ascii') === 'OggS') return 'ogg_opus';
  if (data.length >= 3 && data.subarray(0, 3).toString('ascii') === 'ID3') return 'mp3';
  if (data.length >= 2 && data[0] === 0xff && (data[1] & 0xe0) === 0xe0) return 'mp3';
  if (data.length > 0 && data.subarray(0, Math.min(data.length, 16)).toString('utf-8').trimStart().startsWith('{')) return 'unknown';
  return 'pcm';
}

export class TtsService extends EventEmitter {
  private ws: WebSocket | null = null;
  private sessionId: string = '';
  private replyResolve: (() => void) | null = null;
  private audioSeq = 0;
  private audioFormat: TtsAudioFormat = 'pcm';

  async synthesize(text: string): Promise<void> {
    if (isTtsConfigured()) {
      return this.synthesizeReal(text);
    }
    // Mock: wait a bit then emit done
    await new Promise((r) => setTimeout(r, 300));
    this.emit('done');
  }

  cancel(): void {
    const resolve = this.replyResolve;
    this.replyResolve = null;
    resolve?.();

    const ws = this.ws;
    this.ws = null;
    if (ws) {
      try { ws.close(1000); } catch { /* ignore */ }
    }
  }

  private synthesizeReal(text: string): Promise<void> {
    this.cancel();
    return new Promise((resolve) => {
      this.replyResolve = resolve;
      const sessionId = uuid();
      this.sessionId = sessionId;
      this.audioSeq = 0;
      this.audioFormat = 'pcm';
      this.connectAndSynthesize(text, sessionId);
    });
  }

  private connectAndSynthesize(text: string, sessionId: string): void {
    try {
      const headers: Record<string, string> = {
        'X-Api-Resource-Id': CONFIG.volcTtsResourceId,
        'X-Api-Connect-Id': uuid(),
      };

      if (CONFIG.volcSpeechAuthMode === 'new') {
        headers['X-Api-Key'] = CONFIG.volcTtsToken;
      } else {
        headers['X-Api-App-Id'] = CONFIG.volcTtsAppId;
        headers['X-Api-Access-Key'] = CONFIG.volcTtsToken;
      }

      console.log('[TTS] Connecting with auth mode:', CONFIG.volcSpeechAuthMode);

      const ws = new WebSocket(CONFIG.volcTtsUrl, { headers });
      this.ws = ws;

      ws.on('open', () => {
        if (this.ws !== ws) {
          try { ws.close(1000); } catch { /* ignore */ }
          return;
        }
        console.log('[TTS] Connected');
        ws.send(buildFrame(TtsEvent.START_CONNECTION, [
          { data: Buffer.from('{}', 'utf-8') },
        ]));
      });

      ws.on('message', (d: Buffer) => {
        if (this.ws !== ws) return;
        this.onMessage(ws, d, text, sessionId);
      });
      ws.on('error', (e) => {
        if (this.ws !== ws) return;
        console.error(`[TTS] Error: ${e.message}`);
        this.emit('error', e);
        this.finish(ws);
      });
      ws.on('close', () => {
        console.log('[TTS] Disconnected');
        if (this.ws === ws) this.ws = null;
      });
      ws.on('unexpected-response', (req, res) => {
        let body = '';
        res.on('data', (chunk: Buffer) => { body += chunk.toString(); });
        res.on('end', () => {
          if (this.ws !== ws) return;
          console.error(`[TTS] HTTP ${res.statusCode}: ${body.slice(0, 500)}`);
          this.emit('error', new Error(`TTS server returned ${res.statusCode}: ${body.slice(0, 200)}`));
          this.finish(ws);
        });
      });
    } catch (e: any) {
      console.error(`[TTS] Connect failed: ${e.message}`);
      this.finish();
    }
  }

  private onMessage(ws: WebSocket, data: Buffer, originalText: string, sessionId: string): void {
    if (data.length < 4) return;

    const mt = (data[1] >> 4) & 0x0f;
    const flags = data[1] & 0x0f;

    // Error frame (0b1111)
    if (mt === 0b1111) {
      const ec = data.readInt32BE(4);
      const es = data.readUInt32BE(8);
      const em = data.subarray(12, 12 + es).toString();
      console.error(`[TTS] Error ${ec}: ${em}`);
      this.finish(ws);
      return;
    }

    // Full-server response with event (0b1001 + event flag)
    if (mt === 0b1001 && (flags & 0b0100)) {
      this.handleServerEvent(ws, data, originalText, sessionId);
    }

    // Audio-only response with event (0b1011 + event flag)
    if (mt === 0b1011 && (flags & 0b0100)) {
      this.handleAudioEvent(data);
    }
  }

  private handleServerEvent(ws: WebSocket, data: Buffer, originalText: string, sessionId: string): void {
    const event = data.readInt32BE(4);
    let off = 8;

    const readField = (): Buffer | null => {
      if (off + 4 > data.length) return null;
      const len = data.readUInt32BE(off);
      off += 4;
      if (off + len > data.length) return null;
      const buf = data.subarray(off, off + len);
      off += len;
      return buf;
    };

    switch (event) {
      case TtsEvent.CONNECTION_STARTED: {
        const cid = readField();
        console.log(`[TTS] Connection started: ${cid?.toString() || 'no-id'}`);

        // Step 2: StartSession with speaker + audio params.
        const meta = JSON.stringify({
          event: TtsEvent.START_SESSION,
          user: { uid: 'voice-gateway' },
          req_params: {
            speaker: CONFIG.volcTtsVoiceType,
            audio_params: {
              format: CONFIG.volcTtsAudioFormat,
              sample_rate: CONFIG.volcTtsSampleRate,
            },
          },
        });
        if (ws.readyState === WebSocket.OPEN) ws.send(buildFrame(TtsEvent.START_SESSION, [
          { data: Buffer.from(sessionId, 'utf-8') },
          { data: Buffer.from(meta, 'utf-8') },
        ]));
        break;
      }

      case TtsEvent.SESSION_STARTED: {
        console.log('[TTS] Session started');

        const task = JSON.stringify({
          event: TtsEvent.TASK_REQUEST,
          req_params: {
            text: originalText,
          },
        });
        if (ws.readyState === WebSocket.OPEN) ws.send(buildFrame(TtsEvent.TASK_REQUEST, [
          { data: Buffer.from(sessionId, 'utf-8') },
          { data: Buffer.from(task, 'utf-8') },
        ]));

        // Step 3: End the non-streaming text input after sending one task.
        if (ws.readyState === WebSocket.OPEN) ws.send(buildFrame(TtsEvent.FINISH_SESSION, [
          { data: Buffer.from(sessionId, 'utf-8') },
          { data: Buffer.from(JSON.stringify({ event: TtsEvent.FINISH_SESSION }), 'utf-8') },
        ]));
        break;
      }

      case TtsEvent.SESSION_FINISHED: {
        // All audio done
        console.log('[TTS] Session finished');

        // Step 5: FinishConnection
        if (ws.readyState === WebSocket.OPEN) ws.send(buildFrame(TtsEvent.FINISH_CONNECTION, [
          { data: Buffer.from(JSON.stringify({ event: TtsEvent.FINISH_CONNECTION }), 'utf-8') },
        ]));
        break;
      }

      case TtsEvent.CONNECTION_FINISHED: {
        console.log('[TTS] Connection finished');
        this.finish(ws);
        break;
      }

      case TtsEvent.TTS_SENTENCE_START: {
        // Sentence starting — just log
        break;
      }

      case TtsEvent.TTS_SENTENCE_END: {
        // Sentence ended — could be intermediate, continue waiting
        break;
      }

      case TtsEvent.CONNECTION_FAILED:
      case TtsEvent.SESSION_FAILED:
      case TtsEvent.SESSION_CANCELED: {
        const meta = readField();
        console.error(`[TTS] Failed: ${meta?.toString() || 'unknown'}`);
        this.finish(ws);
        break;
      }
    }
  }

  private handleAudioEvent(data: Buffer): void {
    let off = 8;

    // Audio-only response: Header(4) + Event(int32) + session_id_len + session_id + audio_len + audio_data
    // Skip session_id
    if (off + 4 > data.length) return;
    const sidLen = data.readUInt32BE(off);
    off += 4;
    if (off + sidLen > data.length) return;
    off += sidLen;

    // Read audio data
    if (off + 4 > data.length) return;
    const audioLen = data.readUInt32BE(off);
    off += 4;
    if (off + audioLen > data.length) return;
    const audioData = data.subarray(off, off + audioLen);

    if (audioLen > 0) {
      if (this.audioSeq === 0) {
        this.audioFormat = detectAudioFormat(audioData);
        const firstBytes = audioData.subarray(0, Math.min(audioData.length, 8)).toString('hex');
        console.log(`[TTS] First audio chunk: format=${this.audioFormat}, bytes=${audioLen}, head=${firstBytes}`);
        if (CONFIG.volcTtsAudioFormat === 'pcm' && this.audioFormat !== 'pcm') {
          console.warn(`[TTS] Expected pcm but received ${this.audioFormat}; forwarding detected format to client`);
        }
      }
      const seq = this.audioSeq++;
      this.emit('audio', audioData.toString('base64'), seq, this.audioFormat, CONFIG.volcTtsSampleRate);
    }
  }

  private finish(ws?: WebSocket): void {
    if (ws && this.ws !== ws) return;

    this.emit('done');
    this.replyResolve?.();
    this.replyResolve = null;

    const socket = ws || this.ws;
    if (socket && socket.readyState !== WebSocket.CLOSING && socket.readyState !== WebSocket.CLOSED) {
      try { socket.close(); } catch { /* ignore */ }
    }
    if (!ws || this.ws === ws) {
      this.ws = null;
    }
  }
}
