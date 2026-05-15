import { WebSocketServer, WebSocket } from 'ws';
import { createServer, IncomingMessage } from 'http';
import { verify } from 'jsonwebtoken';
import { parse } from 'url';
import { CONFIG } from './config';
import { VoiceSession } from './session';

const sessions = new Map<WebSocket, VoiceSession>();

function authenticateToken(req: IncomingMessage): string | null {
  // Try Authorization header first
  const authHeader = req.headers['authorization'];
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    try {
      const payload = verify(token, CONFIG.jwtSecret) as any;
      return payload.sub || payload.userId || payload.id;
    } catch {
      return null;
    }
  }

  // Try query param (WeChat Mini Program may send token this way)
  const { query } = parse(req.url || '', true);
  const token = query.token as string;
  if (token) {
    try {
      const payload = verify(token, CONFIG.jwtSecret) as any;
      return payload.sub || payload.userId || payload.id;
    } catch {
      return null;
    }
  }

  return null;
}

const server = createServer((_req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ status: 'ok', service: 'voice-gateway' }));
});

const wss = new WebSocketServer({
  server,
  path: '/ws/voice',
});

wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
  const userId = authenticateToken(req);
  if (!userId) {
    ws.send(JSON.stringify({ type: 'error', code: 'AUTH_FAILED', message: '认证失败' }));
    ws.close(4001, 'Unauthorized');
    return;
  }

  console.log(`[Gateway] Client connected: ${userId}`);
  const session = new VoiceSession(ws, userId);
  sessions.set(ws, session);

  ws.on('message', (data: Buffer | string) => {
    const raw = typeof data === 'string' ? data : data.toString('utf-8');
    session.handleMessage(raw);
  });

  ws.on('close', () => {
    console.log(`[Gateway] Client disconnected: ${userId}`);
    session.cleanup();
    sessions.delete(ws);
  });

  ws.on('error', (err) => {
    console.error(`[Gateway] WebSocket error for ${userId}: ${err.message}`);
    session.cleanup();
    sessions.delete(ws);
  });
});

server.listen(CONFIG.port, () => {
  console.log(`[Voice Gateway] Running on ws://localhost:${CONFIG.port}/ws/voice`);
  console.log(`[Voice Gateway] ASR configured: ${!!CONFIG.volcAsrAppId}`);
  console.log(`[Voice Gateway] TTS configured: ${!!CONFIG.volcTtsAppId}`);
  console.log(`[Voice Gateway] LLM configured: ${!!(CONFIG.volcApiKey && CONFIG.volcLlmModel)}`);
});

process.on('SIGINT', () => {
  console.log('[Voice Gateway] Shutting down...');
  for (const [ws, session] of sessions) {
    session.cleanup();
    ws.close(1001, 'Server shutting down');
  }
  sessions.clear();
  wss.close();
  server.close();
  process.exit(0);
});
