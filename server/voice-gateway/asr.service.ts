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

/**
 * 构建 ASR 二进制帧
 * 帧格式: [4-byte Header] + [Payload size (4B)] + [Payload]
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
): Buffer {
  const header = Buffer.alloc(4);
  header[0] = (0b0001 << 4) | 0b0001; // version=1, header_size=1 (×4 = 4 bytes)
  header[1] = (messageType << 4) | flags;
  header[2] = (serialization << 4) | compression;
  header[3] = 0x00; // reserved

  const size = Buffer.alloc(4);
  size.writeUInt32BE(payload.length, 0);

  return Buffer.concat([header, size, payload]);
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
    this.active = true;
    this.mockBuffer = [];

    if (isAsrConfigured()) {
      this.connectReal();
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

    if (this.ws) {
      this.ws.close(1000, 'User stopped');
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

      this.ws = new WebSocket(CONFIG.volcAsrUrl, { headers });

      this.ws.on('open', () => {
        console.log('[ASR] Connected to Volcengine ASR');
        this.sendFullClientRequest();
      });

      this.ws.on('message', (data: Buffer) => {
        this.handleResponse(data);
      });

      this.ws.on('error', (err) => {
        console.error(`[ASR] WebSocket error: ${err.message}`);
        this.emit('error', err);
      });

      this.ws.on('close', (code, reason) => {
        console.log(`[ASR] Connection closed: ${code} ${reason}`);
        this.ws = null;
      });

      this.ws.on('unexpected-response', (req, res) => {
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
    const frame = buildAsrFrame(0b0001, 0b0000, 0b0001, 0b0000, payload);
    this.ws?.send(frame);
  }

  private feedReal(pcmBuffer: Buffer): void {
    this.seq++;
    const frame = buildAsrFrame(0b0010, 0b0000, 0b0000, 0b0000, pcmBuffer);
    this.ws?.send(frame);
  }

  private handleResponse(data: Buffer): void {
    if (data.length < 4) return;

    const msgType = (data[1] >> 4) & 0x0f;

    if (msgType === 0b1111) {
      // Error message
      const errCode = data.readUInt32BE(4);
      const errSize = data.readUInt32BE(8);
      const errMsg = data.subarray(12, 12 + errSize).toString('utf-8');
      console.error(`[ASR] Server error: ${errCode} ${errMsg}`);
      this.emit('error', new Error(`ASR error ${errCode}: ${errMsg}`));
      return;
    }

    if (msgType !== 0b1001) return; // Not a full server response

    // Parse server response (has sequence)
    // Header(4) + Sequence(4) + PayloadSize(4) + Payload
    if (data.length < 12) return;

    const payloadSize = data.readUInt32BE(8);
    if (data.length < 12 + payloadSize) return;

    let payload: Buffer;
    const compression = data[2] & 0x0f;
    if (compression === 0b0001) {
      payload = zlib.gunzipSync(data.subarray(12, 12 + payloadSize));
    } else {
      payload = data.subarray(12, 12 + payloadSize);
    }

    try {
      const json = JSON.parse(payload.toString('utf-8'));
      const text = json?.result?.text || '';
      if (text) {
        this.emit('final', text);
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
      this.emit('final', text);
    }, 1500);
  }
}
