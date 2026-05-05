export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LlmResponse {
  content: string;
  usage?: { prompt_tokens: number; completion_tokens: number };
}

export interface ProfileEvidence {
  dimension: string;
  label: string;
  text: string;
  confidence: number;
}

export interface ExtractionResult {
  evidence: ProfileEvidence[];
  emotion_summary: string;
  topics: string[];
}

export interface OrchestrationDirective {
  mode: 'free_chat' | 'gentle_probe' | 'comfort';
  probe_hint?: string;
  probe_dimension?: string;
  emotion_label?: string;
}
