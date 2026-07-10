import type { LLMConfig } from './types';

const KEY = 'ai-town.llm';
const USAGE_KEY = 'ai-town.usage';

export const DEFAULT_CONFIG: LLMConfig = {
  endpoint: 'https://api.openai.com/v1/chat/completions',
  apiKey: '',
  model: 'gpt-4o-mini',
  maxConcurrency: 3,
  dailyTokenBudget: 200000
};

export function loadConfig(): LLMConfig {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT_CONFIG };
    const parsed = JSON.parse(raw) as Partial<LLMConfig>;
    return { ...DEFAULT_CONFIG, ...parsed };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

export function saveConfig(cfg: LLMConfig) {
  localStorage.setItem(KEY, JSON.stringify(cfg));
}

export interface Usage {
  date: string;
  promptTokens: number;
  completionTokens: number;
}

export function loadUsage(): Usage {
  try {
    const raw = localStorage.getItem(USAGE_KEY);
    const today = new Date().toISOString().slice(0, 10);
    if (!raw) return { date: today, promptTokens: 0, completionTokens: 0 };
    const u = JSON.parse(raw) as Usage;
    if (u.date !== today) return { date: today, promptTokens: 0, completionTokens: 0 };
    return u;
  } catch {
    const today = new Date().toISOString().slice(0, 10);
    return { date: today, promptTokens: 0, completionTokens: 0 };
  }
}

export function bumpUsage(prompt: number, completion: number) {
  const u = loadUsage();
  u.promptTokens += prompt;
  u.completionTokens += completion;
  localStorage.setItem(USAGE_KEY, JSON.stringify(u));
}
