import type { LLMConfig, RegionId, Vec2, WorldTime } from '../core/types';

export interface HUDState {
  time: WorldTime;
  region: RegionId;
  apiConfigured: boolean;
  model: string;
  tokenUsed: number;
  tokenBudget: number;
  interactionHint?: string;
}

export function formatTokens(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return `${n}`;
}

export function renderHUD(root: HTMLElement, s: HUDState) {
  const h = Math.floor(s.time.minutes / 60);
  const m = Math.floor(s.time.minutes % 60);
  const hh = String(h).padStart(2, '0');
  const mm = String(m).padStart(2, '0');
  root.innerHTML = `
    <div class="hud-pill"><span class="label">Day</span>${s.time.day} · ${s.time.season}</div>
    <div class="hud-pill"><span class="label">${hh}:${mm}</span>${regionName(s.region)} · ${s.time.weather}</div>
    <div class="hud-pill"><span class="label">Model</span>${s.apiConfigured ? s.model : 'No Key'} · ${formatTokens(s.tokenUsed)}/${formatTokens(s.tokenBudget)}</div>
  `;
  if (s.interactionHint) {
    const t = document.createElement('div');
    t.className = 'hud-pill';
    t.style.position = 'absolute';
    t.style.top = '36px';
    t.style.left = '50%';
    t.style.transform = 'translateX(-50%)';
    t.textContent = s.interactionHint;
    root.appendChild(t);
  }
}

function regionName(r: RegionId): string {
  return ({
    plaza: 'Plaza', residential: 'Homes', shops: 'Shops', farm: 'Farm', forest: 'Forest', seaside: 'Seaside'
  } as Record<RegionId, string>)[r];
}

export interface DialogueLine { speaker: string; text: string }
export function renderDialogue(root: HTMLElement, line: DialogueLine | null, hint?: string) {
  if (!line) { root.innerHTML = ''; return; }
  root.innerHTML = `
    <div class="dialogue-box">
      <div class="speaker">${escapeHtml(line.speaker)}</div>
      <div class="text">${escapeHtml(line.text)}</div>
      ${hint ? `<div class="hint">${escapeHtml(hint)}</div>` : ''}
    </div>
  `;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  } as Record<string, string>)[c]!);
}
