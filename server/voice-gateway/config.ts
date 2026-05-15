import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(__dirname, '../.env') });

export const CONFIG = {
  port: parseInt(process.env.VOICE_GATEWAY_PORT || '3001', 10),
  jwtSecret: process.env.JWT_SECRET || 'dev-secret',

  // Database
  databaseUrl: process.env.DATABASE_URL || '',

  // LLM
  volcApiKey: process.env.VOLC_API_KEY || '',
  volcLlmEndpoint: process.env.VOLC_LLM_ENDPOINT || 'https://ark.cn-beijing.volces.com/api/v3',
  volcLlmModel: process.env.VOLC_LLM_MODEL || '',

  // Speech auth mode: "old" = X-Api-App-Key + X-Api-Access-Key（旧版控制台）, "new" = X-Api-Key（新版API Key）
  volcSpeechAuthMode: (process.env.VOLC_SPEECH_AUTH_MODE || 'old') as 'old' | 'new',

  // ASR (Doubao-流式语音识别 2.0)
  volcAsrAppId: process.env.VOLC_ASR_APPID || '',
  volcAsrToken: process.env.VOLC_ASR_TOKEN || '',
  volcAsrResourceId: process.env.VOLC_ASR_RESOURCE_ID || 'volc.seedasr.sauc.duration',
  volcAsrUrl: process.env.VOLC_ASR_WS_URL || 'wss://openspeech.bytedance.com/api/v3/sauc/bigmodel',

  // TTS (Doubao-语音合成-2.0)
  volcTtsAppId: process.env.VOLC_TTS_APPID || '',
  volcTtsToken: process.env.VOLC_TTS_TOKEN || '',
  volcTtsResourceId: process.env.VOLC_TTS_RESOURCE_ID || 'seed-tts-2.0',
  volcTtsVoiceType: process.env.VOLC_TTS_VOICE_TYPE || '',
  volcTtsUrl: 'wss://openspeech.bytedance.com/api/v3/tts/bidirection',

  // Session limits
  minDurationSec: 5 * 60,
  maxDurationSec: 15 * 60,
  softCloseSec: 13 * 60,
  extendDurationSec: 5 * 60,
  absoluteMaxSec: 20 * 60,
};

export function isAsrConfigured(): boolean {
  return !!(CONFIG.volcAsrAppId && CONFIG.volcAsrToken);
}

export function isTtsConfigured(): boolean {
  return !!(CONFIG.volcTtsAppId && CONFIG.volcTtsToken && CONFIG.volcTtsVoiceType);
}

export function isLlmConfigured(): boolean {
  return !!(CONFIG.volcApiKey && CONFIG.volcLlmModel);
}
