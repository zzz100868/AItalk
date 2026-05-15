// ============ WebSocket Protocol Messages ============

// Client → Server
export interface StartMessage {
  type: 'start';
  deviceInfo?: string;
}

export interface AudioChunkMessage {
  type: 'audio_chunk';
  seq: number;
  pcmBase64: string;
}

export interface ExtendMessage {
  type: 'extend';
}

export interface EndMessage {
  type: 'end';
}

export type ClientMessage = StartMessage | AudioChunkMessage | ExtendMessage | EndMessage;

// Server → Client
export interface ConnectedMessage {
  type: 'connected';
  sessionId: string;
}

export interface AsrPartialMessage {
  type: 'asr_partial';
  text: string;
}

export interface AsrFinalMessage {
  type: 'asr_final';
  text: string;
}

export interface AiReplyAudioMessage {
  type: 'ai_reply_audio';
  seq: number;
  pcmBase64: string;
  text: string;
}

export interface AiTurnEndMessage {
  type: 'ai_turn_end';
}

export interface SessionSoftCloseMessage {
  type: 'session_soft_close';
  reason: string;
}

export interface SessionEndMessage {
  type: 'session_end';
  duration: number;
  summary: string;
}

export interface ErrorMessage {
  type: 'error';
  code: string;
  message: string;
}

export type ServerMessage =
  | ConnectedMessage
  | AsrPartialMessage
  | AsrFinalMessage
  | AiReplyAudioMessage
  | AiTurnEndMessage
  | SessionSoftCloseMessage
  | SessionEndMessage
  | ErrorMessage;

// ============ Session State Machine ============

export enum SessionState {
  OPENING = 'opening',
  LISTENING = 'listening',
  ASR_STREAMING = 'asr_streaming',
  THINKING = 'thinking',
  TTS_STREAMING = 'tts_streaming',
  CLOSING = 'closing',
  ENDED = 'ended',
}

// ============ Dialogue ============

export interface DialogueTurnData {
  role: 'user' | 'ai';
  text: string;
}

export interface OrchestrationDirective {
  mode: 'free_chat' | 'gentle_probe' | 'comfort';
  probe_hint?: string;
  probe_dimension?: string;
  emotion_label?: string;
}
