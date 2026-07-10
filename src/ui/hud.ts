import type { RegionId, WorldTime } from '../core/types';

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

const 季节标签: Record<WorldTime['season'], string> = {
  spring: '春', summer: '夏', autumn: '秋', winter: '冬'
};

const 天气标签: Record<WorldTime['weather'], string> = {
  sunny: '晴', cloudy: '多云', rain: '雨', storm: '暴风雨', snow: '雪', fog: '雾'
};

export function renderHUD(root: HTMLElement, s: HUDState) {
  const h = Math.floor(s.time.minutes / 60);
  const m = Math.floor(s.time.minutes % 60);
  const hh = String(h).padStart(2, '0');
  const mm = String(m).padStart(2, '0');
  root.innerHTML = `
    <div class="hud-pill"><span class="label">第</span>${s.time.day} 天 · ${季节标签[s.time.season]}</div>
    <div class="hud-pill"><span class="label">${hh}:${mm}</span>${区域名(s.region)} · ${天气标签[s.time.weather]}</div>
    <div class="hud-pill"><span class="label">模型</span>${s.apiConfigured ? s.model : '未配置'} · ${formatTokens(s.tokenUsed)}/${formatTokens(s.tokenBudget)}</div>
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

function 区域名(r: RegionId): string {
  return ({
    plaza: '中央广场', residential: '居民区', shops: '商业街', farm: '农场', forest: '森林', seaside: '海滨'
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
