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
  return `You are ${persona.name}, the ${persona.occupation} of an AI pixel town.

Personality: ${persona.personality}
Goals: ${persona.goals.join('; ')}
Speech style: ${persona.speechStyle}

Current state:
- Region: ${self.region}
- Energy: ${self.energy}/100, Mood: ${self.mood}/100
- World: day ${time.day}, ${timeLabel(time)}, ${time.weather}

Visible people: ${visibleOthers.length ? visibleOthers.map(o => `${o.name}(aff=${o.affinity.toFixed(2)})`).join(', ') : 'none'}

Recent memories (most recent last):
${  self.shortTerm.slice(-8).map((m: { kind: string; text: string }) => `-[${m.kind}] ${m.text}`).join('\n')}

Choose exactly ONE next action. Respond with STRICT JSON matching this schema:
${DECISION_SCHEMA}

CONSTRAINTS:
- intent must be one of the listed enums
- target.id MUST reference an entity from "Visible people" OR an object in the current region (use the id from valid options)
- speech is what you say out loud (1-2 sentences, in your speech style). Omit if not talking.
- thought is your brief inner monologue (1 sentence)
- memory_to_store: include only if something noteworthy happened (max 1 short sentence)

Valid object/interactable IDs in your region: ${validActions.join(', ')}`;
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
      content: `You are ${persona.name} (${persona.occupation}). Style: ${persona.speechStyle}. Reply with one short line (max 18 words). No narration, no quotes.`
    },
    {
      role: 'user',
      content: `Talking with ${ctx.otherName}. Topic: ${ctx.topic}. Your mood: ${ctx.mood}/100. Reply:`
    }
  ], { temperature: 0.9 });
  return raw.trim().replace(/^["']|["']$/g, '').slice(0, 200);
}
