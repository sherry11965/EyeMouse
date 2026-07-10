import type { RegionId, WorldTime } from '../core/types';

export interface HUDState {
  time: WorldTime;
  region: RegionId;
  regionName: string;
  modeLabel: string;
  selectedName?: string;
  worldName: string;
  apiConfigured: boolean;
  model: string;
  tokenUsed: number;
  tokenBudget: number;
  interactionHint?: string;
}

export interface DialogueLine { speaker: string; text: string }

const seasons: Record<WorldTime['season'], string> = {
  spring: '春', summer: '夏', autumn: '秋', winter: '冬'
};
const weather: Record<WorldTime['weather'], string> = {
  sunny: '晴', cloudy: '云', rain: '雨', storm: '雷', snow: '雪', fog: '雾'
};

export function renderHUD(root: HTMLElement, s: HUDState) {
  const h = Math.floor(s.time.minutes / 60);
  const m = Math.floor(s.time.minutes % 60);
  const usage = Math.min(100, Math.round((s.tokenUsed / Math.max(1, s.tokenBudget)) * 100));
  const usageClass = usage > 80 ? 'is-error' : usage > 50 ? 'is-warning' : 'is-success';
  root.innerHTML = `
    <span class="hud-pill"><span class="hud-label">${escapeHtml(s.worldName)}</span>${s.time.day}日 · ${seasons[s.time.season]}</span>
    <span class="hud-pill"><span class="hud-label">${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}</span>${weather[s.time.weather]}</span>
    <span class="hud-pill"><span class="hud-label">区域</span>${escapeHtml(s.regionName)}</span>
    <span class="hud-pill"><span class="hud-label">模式</span>${escapeHtml(s.modeLabel)}${s.selectedName ? ` · ${escapeHtml(s.selectedName)}` : ''}</span>
    <span class="hud-pill"><span class="hud-label">API</span>${s.apiConfigured
      ? `<span class="nes-text is-success">${escapeHtml(s.model)}</span> · <span class="nes-text ${usageClass}">${usage}%</span>`
      : '<span class="nes-text is-error">本地生成</span>'}</span>
    ${s.interactionHint ? `<span class="hud-hint">${escapeHtml(s.interactionHint)}</span>` : ''}
  `;
}

export function renderDialogue(root: HTMLElement, line: DialogueLine | null, hint?: string) {
  if (!line) { root.innerHTML = ''; return; }
  root.innerHTML = `
    <section class="nes-container is-dark dialogue-box">
      <p class="dialogue-speaker nes-text is-primary">${escapeHtml(line.speaker)}</p>
      <p class="dialogue-text">${escapeHtml(line.text)}</p>
      ${hint ? `<p class="dialogue-hint nes-text is-disabled">${escapeHtml(hint)}</p>` : ''}
    </section>`;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' } as Record<string, string>)[c]!
  );
}
