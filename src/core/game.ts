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
import { aStar } from '../world/pathfind';
import type { Decision, Direction, RegionId, ResidentPersona, ResidentState, WorldTime } from '../core/types';

setPersonas(RESIDENTS);

const PLAYER_PERSONA: ResidentPersona = {
  id: 'player',
  name: '你',
  occupation: '旅人',
  personality: '好奇',
  goals: ['探索小镇'],
  speechStyle: '友好',
  spriteKey: 'knight_yellow',
  home: 'plaza',
  workplace: 'plaza'
};

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
    const cfg = loadConfig();
    if (!cfg.apiKey) {
      this.fallbackWander();
      this.nextDecisionAt = now + 4000 + Math.random() * 3000;
      return;
    }
    this.nextDecisionAt = now + DECISION_INTERVAL + Math.random() * 4000;
    this.busy = true;
    try {
      await this.decide(others, time);
    } catch (e) {
      console.warn('decide failed', (e as Error).message);
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
    const valid = region.interactables.map(i => `${i.id}（${i.label}）`);
    const response = await callLLM([
      {
        role: 'system',
        content:           `你是像素小镇的${persona.name}（${persona.occupation}）。性格：${persona.personality}。说话风格：${persona.speechStyle}。
请选择下一步动作。**仅返回严格的 JSON**，格式：
{"intent":"GO_TO|TALK|WORK|REST|INTERACT_OBJECT|IDLE","target":{"type":"agent|object","id":"..."},"speech":"可选，简短对话","thought":"内心独白","memory_to_store":"可选，简短备注"}
若不需要目标可不填 target；不开口时省略 speech。所有内容用中文。`
      },
      {
        role: 'user',
        content: `当前状态：位置=${this.state.region}，体力=${this.state.energy}，心情=${this.state.mood}，时间=${timeLabel(time)}，天气=${time.weather}，天数=${time.day}。
近期记忆：${shortTermSnapshot(this.state) || '无'}。
可见的人：${visible.length ? visible.map(v => `${v.name}（好感=${v.affinity.toFixed(2)}）`).join('、') : '无'}。
本区域可交互对象：${valid.join('、')}。
请选择下一步动作。`
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

  private fallbackWander() {
    const persona = getResident(this.state.id);
    if (!persona) return;
    const region = getRegion(persona.workplace);
    const target = {
      x: clamp(this.state.pos.x + Math.round((Math.random() - 0.5) * 6), 1, region.size.w - 2),
      y: clamp(this.state.pos.y + Math.round((Math.random() - 0.5) * 6), 1, region.size.h - 2)
    };
    const goal = persona.workplace === this.state.region ? target : { ...region.spawn };
    if (!this.controller.hasPath()) {
      const blocked = (x: number, y: number) => false;
      const path = aStar(this.state.pos, goal, blocked, region.size);
      if (path) this.controller.setPath(path);
    }
    this.thought = '（离线巡游）';
  }
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
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
  walkPhase = 0;

  update(keys: Set<string>, regionSize: { w: number; h: number }) {
    const dx = (keys.has('d') || keys.has('arrowright') ? 1 : 0) - (keys.has('a') || keys.has('arrowleft') ? 1 : 0);
    const dy = (keys.has('s') || keys.has('arrowdown') ? 1 : 0) - (keys.has('w') || keys.has('arrowup') ? 1 : 0);
    if (dx !== 0 || dy !== 0) {
      this.pos.x = Math.max(0, Math.min(regionSize.w - 1, this.pos.x + dx * this.speed));
      this.pos.y = Math.max(0, Math.min(regionSize.h - 1, this.pos.y + dy * this.speed));
      if (Math.abs(dx) >= Math.abs(dy)) this.facing = dx > 0 ? 'right' : 'left';
      else this.facing = dy > 0 ? 'down' : 'up';
      this.walkPhase = (this.walkPhase + 0.15) % 1;
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
      <h2>前往...</h2>
      <p>选择一个区域。</p>
      <div id="travel-list"></div>
      <div class="row"><button class="ghost" id="travel-cancel">取消</button></div>
    `;
    root.appendChild(div);
    const list = div.querySelector('#travel-list')!;
    for (const id of REGIONS[this.player.region].paths.concat([this.player.region])) {
      const r = REGIONS[id];
      const btn = document.createElement('button');
      btn.textContent = r.name + (id === this.player.region ? '（当前）' : '');
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
      <h2>设置</h2>
      <div class="row"><button class="ghost" id="cfg">API Key 设置</button><button class="ghost" id="resume">继续游戏</button></div>
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
      nearest.speech = `嘿，欢迎来到小镇！`;
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
    const screenW = w;
    const screenH = h;
    const z = this.zoom;
    const cam = this.camera;

    drawWorld(ctx, this.player.region, cam, z, this.time, region.size.w, region.size.h);

    ctx.save();
    ctx.scale(z, z);
    ctx.translate(screenW / z / 2 - cam.x * TILE, screenH / z / 2 - cam.y * TILE);

    const others = [...this.agents.values()].filter(a => a.state.region === this.player.region);
    const allSprites: Array<{ y: number; draw: () => void }> = [];
    for (const a of others) {
      const persona = getResident(a.state.id);
      if (!persona) continue;
      const sx = a.state.pos.x * TILE;
      const sy = a.state.pos.y * TILE;
      allSprites.push({
        y: a.state.pos.y,
        draw: () => {
          drawResident(ctx, persona, sx, sy, a.controller.dir, a.walkPhase);
          if (a.speechUntil > performance.now() && a.speech) {
            drawBubble(ctx, sx + TILE, sy - 14, a.speech);
          } else if (a.thought) {
            drawThought(ctx, sx + TILE, sy - 14, a.thought);
          }
        }
      });
    }
    allSprites.push({
      y: this.player.pos.y - 0.05,
      draw: () => {
        const px = this.player.pos.x * TILE;
        const py = this.player.pos.y * TILE;
        drawResident(ctx, PLAYER_PERSONA, px, py, this.player.facing, this.player.walkPhase, true);
      }
    });

    allSprites.sort((a, b) => a.y - b.y);
    for (const s of allSprites) s.draw();
    ctx.restore();

    const hud = document.getElementById('hud')!;
    const usage = loadUsage();
    renderHUD(hud, {
      time: this.time,
      region: this.player.region,
      apiConfigured: this.hasKey,
      model: loadConfig().model,
      tokenUsed: usage.promptTokens + usage.completionTokens,
      tokenBudget: loadConfig().dailyTokenBudget,
      interactionHint: this.hasKey ? 'WASD 移动 · 空格/E 对话 · M 出行 · Esc 设置' : '按 Esc 打开设置，填写 API Key'
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
    renderDialogue(dialogueRoot, line, line ? '按 M 继续旅行' : undefined);
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

function drawBubble(ctx: CanvasRenderingContext2D, x: number, y: number, text: string) {
  ctx.font = '7px monospace';
  const lines = wrapChinese(text, ctx, 120);
  const padX = 5, padY = 4, lh = 10;
  const bw = Math.min(140, Math.max(...lines.map(l => ctx.measureText(l).width)) + padX * 2);
  const bh = lines.length * lh + padY * 2;
  const bx = x, by = y - bh - 4;
  ctx.fillStyle = 'rgba(26,29,46,0.95)';
  ctx.shadowColor = 'rgba(0,0,0,0.4)';
  ctx.shadowBlur = 3;
  roundRect(ctx, bx, by, bw, bh, 3);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = 'rgba(240,192,80,0.4)';
  ctx.lineWidth = 0.5;
  roundRect(ctx, bx, by, bw, bh, 3);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x + 8, by + bh);
  ctx.lineTo(x + 5, by + bh + 4);
  ctx.lineTo(x + 13, by + bh);
  ctx.fillStyle = 'rgba(26,29,46,0.95)';
  ctx.fill();
  ctx.fillStyle = '#f0c050';
  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], bx + padX, by + padY + lh * (i + 1) - 1);
  }
}

function drawThought(ctx: CanvasRenderingContext2D, x: number, y: number, text: string) {
  ctx.font = '6px monospace';
  const display = text.slice(0, 24);
  const tw = Math.min(110, ctx.measureText(display).width + 10);
  const th = 12;
  const bx = x, by = y - th - 3;
  ctx.fillStyle = 'rgba(26,29,46,0.85)';
  ctx.shadowColor = 'rgba(0,0,0,0.3)';
  ctx.shadowBlur = 2;
  roundRect(ctx, bx, by, tw, th, 6);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = 'rgba(100,223,223,0.25)';
  ctx.lineWidth = 0.5;
  roundRect(ctx, bx, by, tw, th, 6);
  ctx.stroke();
  ctx.fillStyle = '#64dfdf';
  ctx.fillText(display, bx + 5, by + 9);
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function wrapChinese(text: string, ctx: CanvasRenderingContext2D, max: number): string[] {
  const lines: string[] = [];
  let cur = '';
  for (const ch of text) {
    const test = cur + ch;
    if (ctx.measureText(test).width > max && cur.length > 0) {
      lines.push(cur);
      cur = ch;
    } else {
      cur = test;
    }
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
