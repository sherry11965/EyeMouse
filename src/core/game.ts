import { AgentController, applyDecision } from '../entities/controller';
import { createInitialStates, setPersonas, shortTermSnapshot } from '../entities/residents';
import { RESIDENTS, getResident } from '../content/residents';
import { advanceTime, createTime, isDaytime, timeLabel, weatherLabel } from '../core/time';
import { callLLM } from '../ai/llm';
import { loadUsage, loadConfig } from '../core/config';
import { REGIONS, getRegion } from '../world/regions';
import { renderHUD, renderDialogue, formatTokens } from '../ui/hud';
import { ensureConfigModal } from '../ui/configModal';
import { drawWorld } from '../render/world';
import { drawResident } from '../render/sprite';
import type { Decision, Direction, RegionId, ResidentState, WorldTime } from '../core/types';

setPersonas(RESIDENTS);

const TILE = 16;
const DECISION_INTERVAL = 12000;
const RECENT_INTERACTIONS: Array<{ ts: number; a: string; b: string }> = [];

class ResidentAgent {
  state: ResidentState;
  controller: AgentController;
  thought = '';
  speech = '';
  speechUntil = 0;
  nextDecisionAt = 0;
  busy = false;
  walkPhase = 0;

  constructor(state: ResidentState) {
    this.state = state;
    this.controller = new AgentController(state.pos);
  }

  async tick(now: number, others: Array<ResidentAgent>, time: WorldTime) {
    if (this.busy) return;
    const hasPath = this.controller.hasPath();
    if (hasPath) {
      const step = this.controller.step();
      this.state.pos = step.pos;
      this.walkPhase = (this.walkPhase + 0.18) % 1;
      this.busy = false;
      return;
    }
    if (now < this.nextDecisionAt) return;
    this.nextDecisionAt = now + DECISION_INTERVAL + Math.random() * 4000;
    this.busy = true;
    try {
      await this.decide(others, time);
    } catch (e) {
      console.warn('decide failed', e);
    } finally {
      this.busy = false;
    }
  }

  async decide(others: Array<ResidentAgent>, time: WorldTime) {
    const persona = getResident(this.state.id);
    if (!persona) return;
    const visible = others
      .filter(o => o.state.region === this.state.region && o !== this)
      .map(o => ({ id: o.state.id, name: getResident(o.state.id)?.name ?? o.state.id, affinity: this.state.relationships[o.state.id]?.affinity ?? 0 }));
    const region = getRegion(this.state.region);
    const valid = region.interactables.map(i => i.id);
    const response = await callLLM([
      {
        role: 'system',
        content: `You are ${persona.name}, the ${persona.occupation} of a pixel town. Personality: ${persona.personality}. Style: ${persona.speechStyle}.
Pick ONE next action. Respond STRICT JSON:
{"intent":"GO_TO|TALK|WORK|REST|INTERACT_OBJECT|IDLE","target":{"type":"agent|object","id":"..."},"speech":"optional short line","thought":"inner monologue","memory_to_store":"optional note"}
Omit target if not needed. speech only if talking.`
      },
      {
        role: 'user',
        content: `State: region=${this.state.region}, energy=${this.state.energy}, mood=${this.state.mood}, time=${timeLabel(time)}, weather=${time.weather}, day=${time.day}.
Recent memory: ${shortTermSnapshot(this.state) || 'none'}.
Visible: ${visible.length ? visible.map(v => `${v.name} (aff=${v.affinity.toFixed(2)})`).join(', ') : 'none'}.
Valid object ids in region: ${valid.join(', ')}.
Pick next action.`
      }
    ], { json: true, temperature: 0.9 });
    const decision: Decision = safeParse(response);
    this.thought = decision.thought ?? '';
    if (decision.speech) {
      this.speech = decision.speech;
      this.speechUntil = performance.now() + 5000;
    }
    if (decision.memory_to_store) {
      this.state.shortTerm.push({
        ts: Date.now(), kind: 'event', importance: 0.4, text: decision.memory_to_store
      });
      if (this.state.shortTerm.length > 20) this.state.shortTerm.shift();
    }
    const othersHere = others.filter(o => o.state.region === this.state.region);
    const agents = othersHere.map(o => ({ id: o.state.id, pos: o.state.pos }));
    const path = applyDecision(this.state, persona, decision, agents);
    if (path) this.controller.setPath(path);
  }

  setThought(t: string) { this.thought = t; }
}

function safeParse(s: string): Decision {
  try { return JSON.parse(s); }
  catch {
    const m = s.match(/\{[\s\S]*\}/);
    if (m) { try { return JSON.parse(m[0]); } catch { /* */ } }
    return { intent: 'IDLE', thought: '...' };
  }
}

class PlayerAgent {
  pos = { x: 14, y: 9 };
  region: RegionId = 'plaza';
  dir: Direction = 'down';
  speed = 0.1;
  facing: Direction = 'down';

  update(keys: Set<string>, regionSize: { w: number; h: number }) {
    const dx = (keys.has('d') || keys.has('arrowright') ? 1 : 0) - (keys.has('a') || keys.has('arrowleft') ? 1 : 0);
    const dy = (keys.has('s') || keys.has('arrowdown') ? 1 : 0) - (keys.has('w') || keys.has('arrowup') ? 1 : 0);
    if (dx !== 0 || dy !== 0) {
      this.pos.x = Math.max(0, Math.min(regionSize.w - 1, this.pos.x + dx * this.speed));
      this.pos.y = Math.max(0, Math.min(regionSize.h - 1, this.pos.y + dy * this.speed));
      if (Math.abs(dx) >= Math.abs(dy)) this.facing = dx > 0 ? 'right' : 'left';
      else this.facing = dy > 0 ? 'down' : 'up';
    }
  }
}

class Game {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  time: WorldTime = createTime();
  agents = new Map<string, ResidentAgent>();
  player = new PlayerAgent();
  camera = { x: 14, y: 9 };
  zoom = 3;
  keys = new Set<string>();
  running = true;
  lastFrame = 0;
  lastSave = 0;
  hasKey = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    const cfg = loadConfig();
    this.hasKey = !!cfg.apiKey;
    const states = createInitialStates();
    for (const [id, s] of states) this.agents.set(id, new ResidentAgent(s));

    window.addEventListener('keydown', e => {
      this.keys.add(e.key.toLowerCase());
      if (e.key === ' ' || e.key === 'e' || e.key === 'E') this.tryInteract();
      if (e.key === 'm' || e.key === 'M') this.travelModal();
      if (e.key === 'Escape') this.pauseMenu();
    });
    window.addEventListener('keyup', e => this.keys.delete(e.key.toLowerCase()));
    window.addEventListener('resize', () => this.resize());

    if (!this.hasKey) ensureConfigModal((c) => { this.hasKey = !!c.apiKey; });
    this.resize();
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.floor(window.innerWidth * dpr);
    this.canvas.height = Math.floor(window.innerHeight * dpr);
    this.ctx.imageSmoothingEnabled = false;
  }

  travelModal() {
    const root = document.getElementById('modal-root')!;
    if (root.querySelector('.modal')) return;
    const div = document.createElement('div');
    div.className = 'modal';
    div.innerHTML = `
      <h2>Travel to...</h2>
      <p>Pick a region.</p>
      <div id="travel-list"></div>
      <div class="row"><button class="ghost" id="travel-cancel">Cancel</button></div>
    `;
    root.appendChild(div);
    const list = div.querySelector('#travel-list')!;
    for (const id of REGIONS[this.player.region].paths.concat([this.player.region])) {
      const r = REGIONS[id];
      const btn = document.createElement('button');
      btn.textContent = r.name + (id === this.player.region ? ' (current)' : '');
      btn.style.margin = '4px';
      btn.style.display = 'block';
      btn.addEventListener('click', () => {
        this.player.region = id;
        this.player.pos = { ...r.spawn };
        this.camera = { ...r.spawn };
        div.remove();
      });
      list.appendChild(btn);
    }
    div.querySelector('#travel-cancel')!.addEventListener('click', () => div.remove());
  }

  pauseMenu() {
    const root = document.getElementById('modal-root')!;
    if (root.querySelector('.modal')) return;
    const div = document.createElement('div');
    div.className = 'modal';
    div.innerHTML = `
      <h2>Settings</h2>
      <div class="row"><button class="ghost" id="cfg">API Key</button><button class="ghost" id="resume">Resume</button></div>
    `;
    root.appendChild(div);
    div.querySelector('#cfg')!.addEventListener('click', () => { div.remove(); ensureConfigModal((c) => { this.hasKey = !!c.apiKey; }); });
    div.querySelector('#resume')!.addEventListener('click', () => div.remove());
  }

  tryInteract() {
    let nearest: ResidentAgent | null = null;
    let bestD = Infinity;
    for (const a of this.agents.values()) {
      if (a.state.region !== this.player.region) continue;
      const d = Math.hypot(a.state.pos.x - this.player.pos.x, a.state.pos.y - this.player.pos.y);
      if (d < 1.6 && d < bestD) { bestD = d; nearest = a; }
    }
    if (nearest) {
      nearest.speech = `Hey there! Glad you stopped by.`;
      nearest.speechUntil = performance.now() + 5000;
      const persona = getResident(nearest.state.id);
      const interaction: typeof RECENT_INTERACTIONS[number] = { ts: Date.now(), a: this.player.region === nearest.state.region ? 'player' : 'remote', b: nearest.state.id };
      RECENT_INTERACTIONS.push(interaction);
      if (RECENT_INTERACTIONS.length > 20) RECENT_INTERACTIONS.shift();
    }
  }

  loop = (now: number) => {
    if (!this.running) return;
    const dt = Math.min(64, now - this.lastFrame);
    this.lastFrame = now;

    this.time = advanceTime(this.time, dt, 90);
    if (!isDaytime(this.time)) randomizeWeather(this.time);

    const region = REGIONS[this.player.region];
    this.player.update(this.keys, region.size);
    const targetCam = { x: this.player.pos.x, y: this.player.pos.y };
    this.camera.x += (targetCam.x - this.camera.x) * 0.18;
    this.camera.y += (targetCam.y - this.camera.y) * 0.18;

    const others = [...this.agents.values()].filter(a => a.state.region === this.player.region);
    for (const a of others) void a.tick(now, others, this.time);

    this.render();
    if (now - this.lastSave > 60000) { this.save(); this.lastSave = now; }

    requestAnimationFrame(this.loop);
  };

  render() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    ctx.fillStyle = '#0a0f1e';
    ctx.fillRect(0, 0, w, h);
    const region = REGIONS[this.player.region];
    drawWorld(ctx, this.player.region, this.camera, this.zoom, this.time, region.size.w, region.size.h);

    const others = [...this.agents.values()].filter(a => a.state.region === this.player.region);
    const allSprites: Array<{ y: number; draw: () => void }> = [];
    for (const a of others) {
      const sx = w / 2 + (a.state.pos.x - this.camera.x) * TILE * this.zoom;
      const sy = h / 2 + (a.state.pos.y - this.camera.y) * TILE * this.zoom;
      const persona = getResident(a.state.id);
      if (!persona) continue;
      allSprites.push({
        y: a.state.pos.y,
        draw: () => {
          drawResident(ctx, persona, sx, sy, a.controller.dir, a.walkPhase);
          if (a.speechUntil > performance.now() && a.speech) {
            drawBubble(ctx, sx + 8, sy - 18, a.speech);
          } else if (a.thought) {
            drawThought(ctx, sx + 8, sy - 18, a.thought);
          }
        }
      });
    }
    const psx = w / 2 + (this.player.pos.x - this.camera.x) * TILE * this.zoom - TILE * this.zoom / 2;
    const psy = h / 2 + (this.player.pos.y - this.camera.y) * TILE * this.zoom - TILE * this.zoom / 2;
    allSprites.push({ y: this.player.pos.y - 0.05, draw: () => drawPlayer(ctx, psx, psy, this.player.facing) });

    allSprites.sort((a, b) => a.y - b.y);
    for (const s of allSprites) s.draw();

    const hud = document.getElementById('hud')!;
    const usage = loadUsage();
    renderHUD(hud, {
      time: this.time,
      region: this.player.region,
      apiConfigured: this.hasKey,
      model: loadConfig().model,
      tokenUsed: usage.promptTokens + usage.completionTokens,
      tokenBudget: loadConfig().dailyTokenBudget,
      interactionHint: this.hasKey ? 'WASD move · Space/E talk · M travel · Esc settings' : 'Open settings (Esc) to add an API key'
    });

    const dialogueRoot = document.getElementById('dialogue')!;
    let line: { speaker: string; text: string } | null = null;
    for (const a of others) {
      if (a.speechUntil > performance.now() && a.speech) {
        const persona = getResident(a.state.id);
        line = { speaker: persona?.name ?? '???', text: a.speech };
        break;
      }
    }
    renderDialogue(dialogueRoot, line, line ? 'Press M to move on' : undefined);
  }

  save() {
    try {
      const data = {
        time: this.time,
        player: this.player,
        agents: [...this.agents.entries()].map(([id, a]) => ({ id, state: a.state }))
      };
      localStorage.setItem('ai-town.save', JSON.stringify(data));
    } catch (e) { console.warn('save failed', e); }
  }
}

function drawPlayer(ctx: CanvasRenderingContext2D, x: number, y: number, dir: Direction) {
  const s = TILE * 3;
  ctx.fillStyle = '#fde68a';
  ctx.fillRect(x + s * 0.25, y + s * 0.15, s * 0.5, s * 0.5);
  ctx.fillStyle = '#1f2937';
  const eyeY = y + s * 0.35;
  ctx.fillRect(x + s * 0.4, eyeY, s * 0.06, s * 0.06);
  ctx.fillRect(x + s * 0.55, eyeY, s * 0.06, s * 0.06);
  ctx.strokeStyle = '#fde68a';
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 1, y + 1, s - 2, s - 2);
}

function drawBubble(ctx: CanvasRenderingContext2D, x: number, y: number, text: string) {
  ctx.font = '12px monospace';
  const lines = wrap(text, ctx, 200);
  const padX = 6, padY = 4, lh = 14;
  const w = Math.min(220, Math.max(...lines.map(l => ctx.measureText(l).width)) + padX * 2);
  const h = lines.length * lh + padY * 2;
  ctx.fillStyle = 'rgba(17,24,39,0.95)';
  ctx.fillRect(x, y - h, w, h);
  ctx.strokeStyle = '#fde68a';
  ctx.strokeRect(x + 0.5, y - h + 0.5, w - 1, h - 1);
  ctx.fillStyle = '#fde68a';
  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], x + padX, y - h + padY + lh * (i + 1) - 3);
  }
}

function drawThought(ctx: CanvasRenderingContext2D, x: number, y: number, text: string) {
  ctx.font = 'italic 11px monospace';
  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  const w = Math.min(180, ctx.measureText(text).width + 12);
  const h = 18;
  ctx.fillRect(x, y - h, w, h);
  ctx.strokeStyle = 'rgba(255,255,255,0.2)';
  ctx.strokeRect(x + 0.5, y - h + 0.5, w - 1, h - 1);
  ctx.fillStyle = '#e5e7eb';
  ctx.fillText(text.slice(0, 36), x + 6, y - 5);
}

function wrap(text: string, ctx: CanvasRenderingContext2D, max: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    const test = cur ? cur + ' ' + w : w;
    if (ctx.measureText(test).width > max) { lines.push(cur); cur = w; }
    else cur = test;
  }
  if (cur) lines.push(cur);
  return lines;
}

const WEATHERS: WorldTime['weather'][] = ['sunny', 'cloudy', 'rain', 'fog'];
function randomizeWeather(t: WorldTime) {
  if (Math.random() < 0.01) t.weather = WEATHERS[Math.floor(Math.random() * WEATHERS.length)];
}

export function startGame() {
  const canvas = document.getElementById('game') as HTMLCanvasElement;
  if (!canvas) throw new Error('no canvas');
  canvas.focus();
  const game = new Game(canvas);
  requestAnimationFrame(game.loop);
}
