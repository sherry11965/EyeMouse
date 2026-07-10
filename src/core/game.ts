import { AgentController, applyDecision } from '../entities/controller';
import { createInitialStates, shortTermSnapshot } from '../entities/residents';
import { advanceTime, createTime, isDaytime, timeLabel } from './time';
import { callLLM } from '../ai/llm';
import { loadUsage, loadConfig } from './config';
import { getAllRegions, getCenterSpawn, getRegion, getRegionAt, getWorldBounds, getWorldData } from '../world/worldState';
import { renderHUD, renderDialogue } from '../ui/hud';
import { ensureConfigModal } from '../ui/configModal';
import { drawWorld } from '../render/world';
import { drawResident } from '../render/sprite';
import { aStar } from '../world/pathfind';
import type { Decision, Direction, GeneratedWorld, ResidentPersona, ResidentState, WorldTime } from './types';

const TILE = 16;
const DECISION_INTERVAL = 12000;
const PAN_SPEED = 0.32;
const BODY_SPEED = 0.12;

type ControlMode = { type: 'god' } | { type: 'possessed'; residentId: string };

class ResidentAgent {
  controller: AgentController;
  thought = '';
  speech = '';
  speechUntil = 0;
  nextDecisionAt = 0;
  busy = false;
  walkPhase = 0;

  constructor(public state: ResidentState, private personas: Map<string, ResidentPersona>) {
    this.controller = new AgentController(state.pos);
  }

  async tick(now: number, others: ResidentAgent[], time: WorldTime, controlled: boolean) {
    if (controlled || this.busy) return;
    if (this.controller.hasPath()) {
      const step = this.controller.step();
      this.state.pos = step.pos;
      this.walkPhase = (this.walkPhase + 0.18) % 1;
      this.updateRegion();
      return;
    }
    if (now < this.nextDecisionAt) return;
    const cfg = loadConfig();
    if (!cfg.apiKey) {
      this.fallbackWander();
      this.nextDecisionAt = now + 3500 + Math.random() * 3500;
      return;
    }
    this.nextDecisionAt = now + DECISION_INTERVAL + Math.random() * 4000;
    this.busy = true;
    try { await this.decide(others, time); }
    catch (e) { console.warn('resident decision failed', e); }
    finally { this.busy = false; }
  }

  clearPath() {
    this.controller = new AgentController(this.state.pos);
  }

  private updateRegion() {
    const region = getRegionAt(this.state.pos.x, this.state.pos.y);
    if (region) this.state.region = region;
  }

  private async decide(others: ResidentAgent[], time: WorldTime) {
    const persona = this.personas.get(this.state.id);
    const region = getRegion(this.state.region);
    if (!persona || !region) return;
    const visible = others
      .filter(o => o !== this && o.state.region === this.state.region)
      .map(o => ({ id: o.state.id, name: this.personas.get(o.state.id)?.name ?? o.state.id }));
    const raw = await callLLM([
      {
        role: 'system',
        content: `你是${persona.name}，职业是${persona.occupation}。性格：${persona.personality}。只返回JSON：{"intent":"GO_TO|TALK|WORK|REST|INTERACT_OBJECT|IDLE","target":{"type":"agent|object","id":"..."},"speech":"可选","thought":"简短想法"}`
      },
      {
        role: 'user',
        content: `世界时间${timeLabel(time)}，所在${region.name}。体力${this.state.energy}，心情${this.state.mood}。附近居民：${visible.map(v => `${v.id}:${v.name}`).join('、') || '无'}。可互动对象：${region.interactables.map(i => `${i.id}:${i.label}`).join('、')}。记忆：${shortTermSnapshot(this.state) || '无'}。`
      }
    ], { json: true, temperature: 0.9 });
    const decision = safeParse(raw);
    this.thought = decision.thought ?? '';
    if (decision.speech) {
      this.speech = decision.speech;
      this.speechUntil = performance.now() + 5000;
    }
    const path = applyDecision(
      this.state,
      persona,
      decision,
      others.filter(o => o.state.region === this.state.region).map(o => ({ id: o.state.id, pos: o.state.pos }))
    );
    if (path) this.controller.setPath(path);
  }

  private fallbackWander() {
    const region = getRegion(this.state.region);
    if (!region) return;
    const ox = region.pos.x;
    const oy = region.pos.y;
    const relStart = { x: Math.round(this.state.pos.x - ox), y: Math.round(this.state.pos.y - oy) };
    const relGoal = {
      x: clamp(relStart.x + Math.round((Math.random() - 0.5) * 12), 1, region.size.w - 2),
      y: clamp(relStart.y + Math.round((Math.random() - 0.5) * 12), 1, region.size.h - 2)
    };
    const blocked = (x: number, y: number) => region.interactables.some(i => i.pos.x === x && i.pos.y === y);
    const path = aStar(relStart, relGoal, blocked, region.size);
    if (path) this.controller.setPath(path.map(p => ({ x: p.x + ox, y: p.y + oy })));
    this.thought = '（自由活动）';
  }
}

export class Game {
  private ctx: CanvasRenderingContext2D;
  private time: WorldTime = createTime();
  private agents = new Map<string, ResidentAgent>();
  private personas = new Map<string, ResidentPersona>();
  private camera = getCenterSpawn();
  private zoom = 1.6;
  private keys = new Set<string>();
  private mode: ControlMode = { type: 'god' };
  private selectedId: string | null = null;
  private running = true;
  private lastFrame = 0;
  private lastSave = 0;
  private hasKey = !!loadConfig().apiKey;
  private frameId = 0;

  constructor(private canvas: HTMLCanvasElement, private world: GeneratedWorld, private restart: () => Promise<void>) {
    this.ctx = canvas.getContext('2d')!;
    for (const p of world.personas) this.personas.set(p.id, p);
    for (const [id, state] of createInitialStates(world.personas)) {
      this.agents.set(id, new ResidentAgent(state, this.personas));
    }
    this.bindEvents();
    this.resize();
  }

  start() { this.frameId = requestAnimationFrame(this.loop); }

  destroy() {
    this.running = false;
    cancelAnimationFrame(this.frameId);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('resize', this.onResize);
    this.canvas.removeEventListener('pointerdown', this.onPointerDown);
    this.canvas.removeEventListener('click', this.onClick);
    this.canvas.removeEventListener('wheel', this.onWheel);
  }

  private bindEvents() {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('resize', this.onResize);
    this.canvas.addEventListener('pointerdown', this.onPointerDown);
    this.canvas.addEventListener('click', this.onClick);
    this.canvas.addEventListener('wheel', this.onWheel, { passive: false });
  }

  private onKeyDown = (e: KeyboardEvent) => {
    this.keys.add(e.key.toLowerCase());
    if (e.key === 'Escape') {
      if (this.mode.type === 'possessed') this.releasePossession();
      else this.pauseMenu();
    }
    if (e.key === 'Enter' && this.mode.type === 'god' && this.selectedId) this.possess(this.selectedId);
    if ((e.key === ' ' || e.key.toLowerCase() === 'e') && this.mode.type === 'possessed') this.tryInteract();
  };

  private onKeyUp = (e: KeyboardEvent) => this.keys.delete(e.key.toLowerCase());
  private onResize = () => this.resize();

  private onWheel = (e: WheelEvent) => {
    if (this.mode.type !== 'god') return;
    e.preventDefault();
    this.zoom = clamp(this.zoom - Math.sign(e.deltaY) * 0.2, 0.7, 3.2);
  };

  private onPointerDown = (e: PointerEvent) => {
    this.handleResidentSelection(e.clientX, e.clientY);
  };

  private onClick = (e: MouseEvent) => {
    this.handleResidentSelection(e.clientX, e.clientY);
  };

  private handleResidentSelection(clientX: number, clientY: number) {
    if (this.mode.type !== 'god') return;
    const rect = this.canvas.getBoundingClientRect();
    const cssX = clientX - rect.left;
    const cssY = clientY - rect.top;
    const viewportCenterX = rect.width / 2;
    const viewportCenterY = rect.height / 2;
    const wx = (cssX - viewportCenterX) / (this.zoom * TILE) + this.camera.x;
    const wy = (cssY - viewportCenterY) / (this.zoom * TILE) + this.camera.y;
    let nearest: ResidentAgent | null = null;
    let distance = 4;
    for (const agent of this.agents.values()) {
      const d = Math.hypot(agent.state.pos.x - wx, agent.state.pos.y - wy);
      if (d < distance) { nearest = agent; distance = d; }
    }
    // 空地也控制离指针最近的居民；上帝视角始终能接管任意角色。
    if (!nearest) {
      let screenDistance = Infinity;
      for (const agent of this.agents.values()) {
        const agentX = viewportCenterX + (agent.state.pos.x - this.camera.x) * TILE * this.zoom;
        const agentY = viewportCenterY + (agent.state.pos.y - this.camera.y) * TILE * this.zoom;
        const d = Math.hypot(agentX - cssX, agentY - cssY);
        if (d < screenDistance) { nearest = agent; screenDistance = d; }
      }
    }
    this.selectedId = nearest?.state.id ?? null;
    if (nearest) this.possess(nearest.state.id);
  };

  private resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.floor(window.innerWidth * dpr);
    this.canvas.height = Math.floor(window.innerHeight * dpr);
    this.ctx.imageSmoothingEnabled = false;
  }

  private possess(id: string) {
    const agent = this.agents.get(id);
    if (!agent) return;
    agent.clearPath();
    this.mode = { type: 'possessed', residentId: id };
    this.camera = { ...agent.state.pos };
  }

  private releasePossession() {
    this.mode = { type: 'god' };
  }

  private updateControl() {
    const dx = (this.keys.has('d') || this.keys.has('arrowright') ? 1 : 0) - (this.keys.has('a') || this.keys.has('arrowleft') ? 1 : 0);
    const dy = (this.keys.has('s') || this.keys.has('arrowdown') ? 1 : 0) - (this.keys.has('w') || this.keys.has('arrowup') ? 1 : 0);
    const bounds = getWorldBounds();
    if (this.mode.type === 'god') {
      this.camera.x = clamp(this.camera.x + dx * PAN_SPEED / this.zoom, 0, bounds.w - 1);
      this.camera.y = clamp(this.camera.y + dy * PAN_SPEED / this.zoom, 0, bounds.h - 1);
      return;
    }
    const agent = this.agents.get(this.mode.residentId);
    if (!agent || (dx === 0 && dy === 0)) return;
    agent.state.pos.x = clamp(agent.state.pos.x + dx * BODY_SPEED, 0, bounds.w - 1);
    agent.state.pos.y = clamp(agent.state.pos.y + dy * BODY_SPEED, 0, bounds.h - 1);
    if (Math.abs(dx) >= Math.abs(dy)) agent.controller.dir = dx > 0 ? 'right' : 'left';
    else agent.controller.dir = dy > 0 ? 'down' : 'up';
    agent.walkPhase = (agent.walkPhase + 0.15) % 1;
    const region = getRegionAt(agent.state.pos.x, agent.state.pos.y);
    if (region) agent.state.region = region;
    this.camera.x += (agent.state.pos.x - this.camera.x) * 0.25;
    this.camera.y += (agent.state.pos.y - this.camera.y) * 0.25;
  }

  private tryInteract() {
    if (this.mode.type !== 'possessed') return;
    const self = this.agents.get(this.mode.residentId);
    if (!self) return;
    let nearest: ResidentAgent | null = null;
    let best = 1.8;
    for (const agent of this.agents.values()) {
      if (agent === self) continue;
      const d = Math.hypot(agent.state.pos.x - self.state.pos.x, agent.state.pos.y - self.state.pos.y);
      if (d < best) { best = d; nearest = agent; }
    }
    if (nearest) {
      nearest.speech = `你好，${this.personas.get(self.state.id)?.name ?? '朋友'}。`;
      nearest.speechUntil = performance.now() + 5000;
    }
  }

  private pauseMenu() {
    const root = document.getElementById('modal-root')!;
    if (root.firstElementChild) return;
    const wrap = document.createElement('div');
    wrap.innerHTML = `<div class="modal-backdrop"><section class="nes-container is-dark with-title modal-card">
      <p class="title">世界控制</p>
      <p class="modal-desc">${escapeHtml(this.world.story)}</p>
      <p class="modal-desc">当前事件：${escapeHtml(this.world.events.join(' · '))}</p>
      <div class="modal-row">
        <button class="nes-btn" id="api-settings">AI 设置</button>
        <button class="nes-btn is-warning" id="restart-world">重新生成世界</button>
        <button class="nes-btn is-primary" id="resume-world">继续</button>
      </div></section></div>`;
    root.appendChild(wrap);
    wrap.querySelector('#api-settings')!.addEventListener('click', () => {
      wrap.remove();
      ensureConfigModal(c => { this.hasKey = !!c.apiKey; });
    });
    wrap.querySelector('#restart-world')!.addEventListener('click', () => {
      wrap.remove();
      void this.restart();
    });
    wrap.querySelector('#resume-world')!.addEventListener('click', () => wrap.remove());
  }

  private loop = (now: number) => {
    if (!this.running) return;
    const dt = Math.min(64, now - this.lastFrame);
    this.lastFrame = now;
    this.time = advanceTime(this.time, dt, 90);
    if (!isDaytime(this.time)) randomizeWeather(this.time);
    this.updateControl();

    const agents = [...this.agents.values()];
    for (const agent of agents) {
      const controlled = this.mode.type === 'possessed' && this.mode.residentId === agent.state.id;
      void agent.tick(now, agents, this.time, controlled);
    }

    this.render();
    if (now - this.lastSave > 60000) { this.save(); this.lastSave = now; }
    this.frameId = requestAnimationFrame(this.loop);
  };

  private render() {
    const ctx = this.ctx;
    ctx.fillStyle = '#87ceeb';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    const worldMap = this.world.worldMap;
    if (worldMap) {
      drawWorld(ctx, worldMap, this.camera, this.zoom, this.time);
    }

    ctx.save();
    ctx.scale(this.zoom, this.zoom);
    ctx.translate(this.canvas.width / this.zoom / 2 - this.camera.x * TILE, this.canvas.height / this.zoom / 2 - this.camera.y * TILE);
    const sprites: Array<{ y: number; draw: () => void }> = [];
    for (const agent of this.agents.values()) {
      const persona = this.personas.get(agent.state.id);
      if (!persona) continue;
      const sx = agent.state.pos.x * TILE;
      const sy = agent.state.pos.y * TILE;
      sprites.push({
        y: agent.state.pos.y,
        draw: () => {
          drawResident(ctx, persona, sx, sy, agent.controller.dir, agent.walkPhase,
            this.selectedId === agent.state.id || (this.mode.type === 'possessed' && this.mode.residentId === agent.state.id));
          if (agent.speechUntil > performance.now() && agent.speech) drawBubble(ctx, sx + TILE, sy - 14, agent.speech);
          else if (agent.thought) drawThought(ctx, sx + TILE, sy - 14, agent.thought);
        }
      });
    }
    sprites.sort((a, b) => a.y - b.y);
    for (const sprite of sprites) sprite.draw();
    ctx.restore();

    const activeId = this.mode.type === 'possessed' ? this.mode.residentId : this.selectedId;
    const active = activeId ? this.agents.get(activeId) : null;
    const activePersona = activeId ? this.personas.get(activeId) : null;
    const cameraRegionId = active?.state.region ?? getRegionAt(this.camera.x, this.camera.y) ?? getAllRegions()[0]?.id ?? '';
    const regionName = getRegion(cameraRegionId)?.name ?? '荒野';
    const usage = loadUsage();
    renderHUD(document.getElementById('hud')!, {
      time: this.time,
      region: cameraRegionId,
      regionName,
      modeLabel: this.mode.type === 'god' ? '上帝视角' : '手动控制',
      selectedName: activePersona ? `${activePersona.name} / ${activePersona.occupation}` : undefined,
      worldName: this.world.worldName,
      apiConfigured: this.hasKey,
      model: loadConfig().model,
      tokenUsed: usage.promptTokens + usage.completionTokens,
      tokenBudget: loadConfig().dailyTokenBudget,
      interactionHint: this.mode.type === 'god'
        ? 'WASD/方向键移动镜头 · 滚轮缩放 · 点击村民直接控制 · Esc设置'
        : 'WASD移动 · 空格/E互动 · Esc返回上帝视角'
    });

    let line: { speaker: string; text: string } | null = null;
    for (const agent of this.agents.values()) {
      if (agent.speechUntil > performance.now() && agent.speech) {
        line = { speaker: this.personas.get(agent.state.id)?.name ?? '居民', text: agent.speech };
        break;
      }
    }
    renderDialogue(document.getElementById('dialogue')!, line, line ? '观察正在发生的对话' : undefined);
  }

  private save() {
    try {
      localStorage.setItem('ai-town.session', JSON.stringify({
        world: getWorldData(),
        time: this.time,
        agents: [...this.agents.values()].map(a => a.state)
      }));
    } catch (e) { console.warn('save failed', e); }
  }
}

function safeParse(raw: string): Decision {
  try { return JSON.parse(raw) as Decision; }
  catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) { try { return JSON.parse(match[0]) as Decision; } catch { /* fallback */ } }
    return { intent: 'IDLE', thought: '观察四周' };
  }
}

function clamp(n: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, n)); }
function escapeHtml(s: string) { return s.replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' } as Record<string,string>)[c]!); }

function drawBubble(ctx: CanvasRenderingContext2D, x: number, y: number, text: string) {
  ctx.font = '7px Zpix, monospace';
  const lines = wrapChinese(text, ctx, 120);
  const padX = 5, padY = 4, lh = 10;
  const bw = Math.min(140, Math.max(...lines.map(l => ctx.measureText(l).width)) + padX * 2);
  const bh = lines.length * lh + padY * 2;
  const bx = x, by = y - bh - 4;
  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  ctx.fillRect(bx, by, bw, bh);
  ctx.strokeStyle = 'rgba(225,112,85,0.7)';
  ctx.strokeRect(bx + 0.5, by + 0.5, bw - 1, bh - 1);
  ctx.fillStyle = '#2d3436';
  for (let i = 0; i < lines.length; i++) ctx.fillText(lines[i], bx + padX, by + padY + lh * (i + 1) - 1);
}

function drawThought(ctx: CanvasRenderingContext2D, x: number, y: number, text: string) {
  ctx.font = '6px Zpix, monospace';
  const display = text.slice(0, 24);
  const width = Math.min(110, ctx.measureText(display).width + 10);
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.fillRect(x, y - 15, width, 12);
  ctx.fillStyle = '#0984e3';
  ctx.fillText(display, x + 5, y - 6);
}

function wrapChinese(text: string, ctx: CanvasRenderingContext2D, max: number): string[] {
  const lines: string[] = [];
  let current = '';
  for (const char of text) {
    if (ctx.measureText(current + char).width > max && current) { lines.push(current); current = char; }
    else current += char;
  }
  if (current) lines.push(current);
  return lines;
}

const WEATHERS: WorldTime['weather'][] = ['sunny', 'cloudy', 'rain', 'fog'];
function randomizeWeather(t: WorldTime) {
  if (Math.random() < 0.01) t.weather = WEATHERS[Math.floor(Math.random() * WEATHERS.length)];
}
