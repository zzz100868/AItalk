import { EventEmitter } from 'events';
import WebSocket from 'ws';
import * as zlib from 'zlib';
import { isAsrConfigured, CONFIG } from './config';

const MOCK_TEXTS = [
  '你好呀，今天天气不错。',
  '最近工作挺忙的，有点累。',
  '周末想去公园走走。',
  '我比较喜欢安静的环境。',
  '对，我觉得沟通很重要。',
  '我平时喜欢看书和听播客。',
  '嗯，我是那种想清楚再说的人。',
];

const CONNECT_TIMEOUT_MS = 10_000;

/**
 * 构建 ASR 二进制帧
 * 帧格式: [4-byte Header] + [Optional sequence (4B)] + [Payload size (4B)] + [Payload]
 *
 * Header byte layout:
 *   Byte 0: [Protocol version (4)] [Header size (4)]
 *   Byte 1: [Message type (4)]     [Flags (4)]
 *   Byte 2: [Serialization (4)]    [Compression (4)]
 *   Byte 3: Reserved
 */
function buildAsrFrame(
  messageType: number,
  flags: number,
  serialization: number,
  compression: number,
  payload: Buffer,
  sequence?: number,
): Buffer {
  const header = Buffer.alloc(4);
  header[0] = (0b0001 << 4) | 0b0001; // version=1, header_size=1 (×4 = 4 bytes)
  header[1] = (messageType << 4) | flags;
  header[2] = (serialization << 4) | compression;
  header[3] = 0x00; // reserved

  const parts: Uint8Array[] = [header];
  if ((flags & 0b0001) === 0b0001) {
    if (typeof sequence !== 'number') {
      throw new Error('ASR frame sequence is required by flags');
    }
    const sequenceBuffer = Buffer.alloc(4);
    sequenceBuffer.writeInt32BE(sequence, 0);
    parts.push(sequenceBuffer);
  }

  const size = Buffer.alloc(4);
  size.writeUInt32BE(payload.length, 0);
  parts.push(size, payload);

  return Buffer.concat(parts);
}

function uuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export class AsrService extends EventEmitter {
  private ws: WebSocket | null = null;
  private active = false;
  private seq = 0;

  // Mock state
  private mockBuffer: Buffer[] = [];
  private mockTimer: NodeJS.Timeout | null = null;

  constructor() {
    super();
  }

  start(): void {
    if (this.active) {
      if (!isAsrConfigured() || this.ws?.readyState === WebSocket.OPEN) {
        this.emit('ready');
      }
      return;
    }
    this.active = true;
    this.seq = 0;
    this.mockBuffer = [];

    if (isAsrConfigured()) {
      this.connectReal();
    } else {
      setImmediate(() => this.emit('ready'));
    }
  }

  feedAudio(pcmBuffer: Buffer): void {
    if (!this.active) return;

    if (isAsrConfigured() && this.ws) {
      if (this.ws.readyState === WebSocket.OPEN) {
        this.feedReal(pcmBuffer);
      }
      // silently drop audio when ASR socket is still connecting
    } else {
      this.feedMock(pcmBuffer);
    }
  }

  stop(): void {
    this.active = false;

    if (this.mockTimer) {
      clearTimeout(this.mockTimer);
      this.mockTimer = null;
    }

    const ws = this.ws;
    if (ws) {
      if (ws.readyState === WebSocket.OPEN) {
        const endFrame = buildAsrFrame(0b0010, 0b0010, 0b0000, 0b0000, Buffer.alloc(0));
        ws.send(endFrame, () => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.close(1000, 'User stopped');
          }
        });
      } else {
        ws.close(1000, 'User stopped');
      }
      this.ws = null;
    }
  }

  // ============ Real Implementation ============

  private connectReal(): void {
    try {
      const headers: Record<string, string> = {
        'X-Api-Resource-Id': CONFIG.volcAsrResourceId,
        'X-Api-Request-Id': uuid(),
        'X-Api-Connect-Id': uuid(),
      };

      if (CONFIG.volcSpeechAuthMode === 'new') {
        // 新版控制台：X-Api-Key 单一密钥
        headers['X-Api-Key'] = CONFIG.volcAsrToken;
      } else {
        // 旧版控制台：X-Api-App-Key + X-Api-Access-Key
        headers['X-Api-App-Key'] = CONFIG.volcAsrAppId;
        headers['X-Api-Access-Key'] = CONFIG.volcAsrToken;
      }

      console.log('[ASR] Connection params:', JSON.stringify({
        authMode: CONFIG.volcSpeechAuthMode,
        appId: CONFIG.volcAsrAppId,
        tokenPrefix: CONFIG.volcAsrToken.slice(0, 6),
        tokenLength: CONFIG.volcAsrToken.length,
        resourceId: CONFIG.volcAsrResourceId,
        wsUrl: CONFIG.volcAsrUrl,
      }));

      const ws = new WebSocket(CONFIG.volcAsrUrl, { headers });
      this.ws = ws;
      const connectTimer = setTimeout(() => {
        if (this.ws !== ws || ws.readyState === WebSocket.OPEN) return;
        const err = new Error('ASR connection timeout');
        console.error(`[ASR] ${err.message}`);
        this.active = false;
        this.emit('error', err);
        try { ws.close(); } catch { /* ignore */ }
        if (this.ws === ws) this.ws = null;
      }, CONNECT_TIMEOUT_MS);

      ws.on('open', () => {
        clearTimeout(connectTimer);
        console.log('[ASR] Connected to Volcengine ASR');
        this.sendFullClientRequest();
        this.emit('ready');
      });

      ws.on('message', (data: Buffer) => {
        this.handleResponse(data);
      });

      ws.on('error', (err) => {
        clearTimeout(connectTimer);
        console.error(`[ASR] WebSocket error: ${err.message}`);
        this.active = false;
        this.emit('error', err);
      });

      ws.on('close', (code, reason) => {
        clearTimeout(connectTimer);
        console.log(`[ASR] Connection closed: ${code} ${reason}`);
        if (this.ws === ws) {
          this.ws = null;
          this.active = false;
        }
      });

      ws.on('unexpected-response', (req, res) => {
        clearTimeout(connectTimer);
        let body = '';
        res.on('data', (chunk: Buffer) => { body += chunk.toString(); });
        res.on('end', () => {
          console.error(`[ASR] HTTP ${res.statusCode}: ${body.slice(0, 500)}`);
          this.emit('error', new Error(`ASR server returned ${res.statusCode}: ${body.slice(0, 200)}`));
        });
      });
    } catch (e: any) {
      console.error(`[ASR] Failed to connect: ${e.message}`);
      this.emit('error', new Error(`ASR connection failed: ${e.message}`));
    }
  }

  private sendFullClientRequest(): void {
    const config = {
      user: { uid: 'voice-gateway', did: 'aitalk', platform: 'NodeJS' },
      audio: {
        format: 'pcm',
        rate: 16000,
        bits: 16,
        channel: 1,
      },
      request: {
        model_name: 'bigmodel',
        enable_itn: true,
        enable_punc: true,
        enable_ddc: false,
      },
    };

    const payload = Buffer.from(JSON.stringify(config), 'utf-8');
    const frame = buildAsrFrame(0b0001, 0b0001, 0b0001, 0b0000, payload, ++this.seq);
    this.ws?.send(frame);
  }

  private feedReal(pcmBuffer: Buffer): void {
    this.seq++;
    const frame = buildAsrFrame(0b0010, 0b0000, 0b0000, 0b0000, pcmBuffer);
    this.ws?.send(frame);
  }

  private handleResponse(data: Buffer): void {
    if (data.length < 4) return;

    const headerSize = (data[0] & 0x0f) * 4;
    if (data.length < headerSize + 4) return;

    const msgType = (data[1] >> 4) & 0x0f;
    const flags = data[1] & 0x0f;

    if (msgType === 0b1111) {
      // Error message
      if (data.length < headerSize + 8) return;
      const errCode = data.readUInt32BE(headerSize);
      const errSize = data.readUInt32BE(headerSize + 4);
      const errMsg = data.subarray(headerSize + 8, headerSize + 8 + errSize).toString('utf-8');
      console.error(`[ASR] Server error: ${errCode} ${errMsg}`);
      this.emit('error', new Error(`ASR error ${errCode}: ${errMsg}`));
      return;
    }

    if (msgType !== 0b1001) return; // Not a full server response

    let offset = headerSize;
    let sequence: number | null = null;
    if ((flags & 0b0001) === 0b0001) {
      if (data.length < offset + 4) return;
      sequence = data.readInt32BE(offset);
      offset += 4;
    }

    if (data.length < offset + 4) return;
    const payloadSize = data.readUInt32BE(offset);
    offset += 4;
    if (data.length < offset + payloadSize) return;

    let payload: Buffer;
    const compression = data[2] & 0x0f;
    if (compression === 0b0001) {
      payload = zlib.gunzipSync(data.subarray(offset, offset + payloadSize));
    } else {
      payload = data.subarray(offset, offset + payloadSize);
    }

    try {
      const json = JSON.parse(payload.toString('utf-8'));
      const text = json?.result?.text || '';
      if (text) {
        const isFinal = flags === 0b0010 || flags === 0b0011 || (sequence !== null && sequence < 0);
        const confidence = typeof json?.result?.confidence === 'number'
          ? json.result.confidence
          : undefined;
        this.emit(isFinal ? 'final' : 'partial', text, confidence);
      }
    } catch (e) {
      console.error('[ASR] Failed to parse response:', e);
    }
  }

  // ============ Mock Implementation ============

  private feedMock(pcmBuffer: Buffer): void {
    this.mockBuffer.push(pcmBuffer);

    if (this.mockTimer) clearTimeout(this.mockTimer);

    // Simulate VAD: emit partial immediately, then final after 1.5s of silence
    this.emit('partial', '（语音识别中...）');

    this.mockTimer = setTimeout(() => {
      if (!this.active) return;
      const text = MOCK_TEXTS[Math.floor(Math.random() * MOCK_TEXTS.length)];
      this.emit('final', text, 1);
    }, 1500);
  }
}
