import type { Decision, LLMConfig, ResidentPersona, ResidentState, WorldTime } from '../core/types';
import { bumpUsage, loadUsage, loadConfig, saveConfig } from '../core/config';

interface ChatMsg {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatResponse {
  choices: { message: { content: string } }[];
  usage?: { prompt_tokens: number; completion_tokens: number };
}

class Semaphore {
  private active = 0;
  private queue: Array<() => void> = [];
  constructor(private max: number) {}
  async acquire(): Promise<void> {
    if (this.active < this.max) { this.active++; return; }
    await new Promise<void>(resolve => this.queue.push(resolve));
    this.active++;
  }
  release() {
    this.active--;
    const next = this.queue.shift();
    if (next) next();
  }
}

const sem = new Semaphore(3);

export async function callLLM(
  messages: ChatMsg[],
  opts: { temperature?: number; json?: boolean } = {}
): Promise<string> {
  const cfg = loadConfig();
  if (!cfg.apiKey) throw new Error('Missing API key');
  const usage = loadUsage();
  if (usage.promptTokens + usage.completionTokens >= cfg.dailyTokenBudget) {
    throw new Error('Daily token budget exceeded');
  }
  await sem.acquire();
  try {
    const body: Record<string, unknown> = {
      model: cfg.model,
      messages,
      temperature: opts.temperature ?? 0.8
    };
    if (opts.json) body.response_format = { type: 'json_object' };
    const res = await fetch(cfg.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${cfg.apiKey}`
      },
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`LLM ${res.status}: ${t.slice(0, 200)}`);
    }
    const data = (await res.json()) as ChatResponse;
    const text = data.choices?.[0]?.message?.content ?? '';
    if (data.usage) bumpUsage(data.usage.prompt_tokens, data.usage.completion_tokens);
    return text;
  } finally {
    sem.release();
  }
}

export function setConfig(cfg: LLMConfig) { saveConfig(cfg); }
export function getConfig(): LLMConfig { return loadConfig(); }

const DECISION_SCHEMA = `{
  "type": "object",
  "required": ["intent", "thought"],
  "properties": {
    "intent": { "type": "string", "enum": ["GO_TO", "TALK", "WORK", "REST", "INTERACT_OBJECT", "IDLE"] },
    "target": {
      "type": "object",
      "properties": { "type": { "type": "string", "enum": ["agent","tile","object"] }, "id": { "type": "string" } }
    },
    "speech": { "type": "string" },
    "thought": { "type": "string" },
    "memory_to_store": { "type": "string" }
  }
}`;

export function buildDecisionPrompt(
  persona: ResidentPersona,
  self: ResidentState,
  time: WorldTime,
  visibleOthers: Array<{ id: string; name: string; affinity: number }>,
  validActions: string[]
): string {
  return `你是像素小镇的 ${persona.name}（${persona.occupation}）。

- 性格：${persona.personality}
- 目标：${persona.goals.join('；')}
- 说话风格：${persona.speechStyle}

当前状态：
- 所在区域：${self.region}
- 体力 ${self.energy}/100；心情 ${self.mood}/100
- 世界：第 ${time.day} 天，${timeLabel(time)}，${time.weather}

可见的人：${visibleOthers.length ? visibleOthers.map(o => `${o.name}（好感=${o.affinity.toFixed(2)}）`).join('、') : '无'}

近期记忆（由近到远）：
${self.shortTerm.slice(-8).map((m: { kind: string; text: string }) => `- [${m.kind}] ${m.text}`).join('\n')}

请只选择 1 个下一步动作，严格按以下 JSON Schema 输出：
${DECISION_SCHEMA}

约束：
- intent 必须是上面列出的枚举之一
- target.id 必须是"可见的人"或本区域可交互对象中的一个
- speech：仅在说话时给出，1-2 句，用你的说话风格
- thought：1 句内心独白
- memory_to_store：仅在值得记住时给出，1 句简短
- 所有内容必须用中文

本区域可用对象 ID：${validActions.join('、')}`;
}

function timeLabel(t: WorldTime): string {
  const h = Math.floor(t.minutes / 60);
  const m = Math.floor(t.minutes % 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export async function decide(
  persona: ResidentPersona,
  self: ResidentState,
  time: WorldTime,
  visibleOthers: Array<{ id: string; name: string; affinity: number }>,
  validActions: string[]
): Promise<Decision> {
  const prompt = buildDecisionPrompt(persona, self, time, visibleOthers, validActions);
  const raw = await callLLM(
    [
      { role: 'system', content: 'You output only JSON. No markdown fences.' },
      { role: 'user', content: prompt }
    ],
    { json: true, temperature: 0.85 }
  );
  try {
    const parsed = JSON.parse(raw) as Decision;
    return parsed;
  } catch {
    return { intent: 'IDLE', thought: '...processing...' };
  }
}

export async function generateDialogue(
  persona: ResidentPersona,
  ctx: { otherName: string; topic: string; mood: number }
): Promise<string> {
  const raw = await callLLM([
    {
      role: 'system',
      content: `你是 ${persona.name}（${persona.occupation}）。说话风格：${persona.speechStyle}。请用中文回 1 句简短对话（不超过 20 字），不要加旁白或引号。`
    },
    {
      role: 'user',
      content: `正在与 ${ctx.otherName} 聊天。话题：${ctx.topic}。你的心情：${ctx.mood}/100。请回复：`
    }
  ], { temperature: 0.9 });
  return raw.trim().replace(/^["']|["']$/g, '').slice(0, 200);
}
