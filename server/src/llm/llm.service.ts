import { Injectable, Logger } from '@nestjs/common';
import { ChatMessage, LlmResponse } from './llm.types';

@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);

  private readonly endpoint = process.env.VOLC_LLM_ENDPOINT || 'https://ark.cn-beijing.volces.com/api/v3';
  private readonly model = process.env.VOLC_LLM_MODEL || '';
  private readonly apiKey = process.env.VOLC_API_KEY || '';

  async chat(messages: ChatMessage[], temperature = 0.8): Promise<LlmResponse | null> {
    if (!this.apiKey || !this.model) {
      this.logger.warn('VOLC_API_KEY or VOLC_LLM_MODEL not configured — skipping LLM call');
      return null;
    }

    try {
      const res = await fetch(`${this.endpoint}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages,
          temperature,
          max_tokens: 512,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        this.logger.error(`LLM API error ${res.status}: ${text}`);
        return null;
      }

      const data = await res.json();
      const choice = data.choices?.[0];
      if (!choice) {
        this.logger.error('LLM returned no choices');
        return null;
      }

      return {
        content: choice.message?.content || '',
        usage: data.usage,
      };
    } catch (e) {
      this.logger.error(`LLM request failed: ${e.message}`);
      return null;
    }
  }

  async chatWithJson(messages: ChatMessage[], temperature = 0.3): Promise<any | null> {
    if (!this.apiKey || !this.model) {
      return null;
    }

    try {
      const res = await fetch(`${this.endpoint}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages,
          temperature,
          max_tokens: 1024,
          response_format: { type: 'json_object' },
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        this.logger.error(`LLM JSON API error ${res.status}: ${text}`);
        return null;
      }

      const data = await res.json();
      const content = data.choices?.[0]?.message?.content;
      if (!content) return null;

      return JSON.parse(content);
    } catch (e) {
      this.logger.error(`LLM JSON request failed: ${e.message}`);
      return null;
    }
  }
}
