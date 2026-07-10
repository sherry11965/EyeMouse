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

const 季节: Record<WorldTime['season'], string> = {
  spring: '春', summer: '夏', autumn: '秋', winter: '冬'
};

const 天气: Record<WorldTime['weather'], string> = {
  sunny: '晴', cloudy: '云', rain: '雨', storm: '雷', snow: '雪', fog: '雾'
};

const 区域图标: Record<RegionId, string> = {
  plaza: '⛲', residential: '🏘', shops: '🏪', farm: '🌾', forest: '🌲', seaside: '⛵'
};

const 区域名: Record<RegionId, string> = {
  plaza: '中央广场', residential: '居民区', shops: '商业街', farm: '农场', forest: '森林', seaside: '码头'
};

export function renderHUD(root: HTMLElement, s: HUDState) {
  const h = Math.floor(s.time.minutes / 60);
  const m = Math.floor(s.time.minutes % 60);
  const hh = String(h).padStart(2, '0');
  const mm = String(m).padStart(2, '0');
  const usagePercent = Math.min(100, Math.round((s.tokenUsed / s.tokenBudget) * 100));
  const usageColor = usagePercent > 80 ? 'var(--bad)' : usagePercent > 50 ? 'var(--accent)' : 'var(--good)';

  root.innerHTML = `
    <div class="hud-pill">
      <span class="label">DAY</span>${s.time.day} · ${季节[s.time.season]}
    </div>
    <div class="hud-pill">
      <span class="label">${hh}:${mm}</span>
      ${天气[s.time.weather]}
    </div>
    <div class="hud-pill">
      ${区域图标[s.region]} ${区域名[s.region]}
    </div>
    <div class="hud-pill">
      <span class="label">API</span>
      ${s.apiConfigured
        ? `<span style="color:var(--good)">${s.model}</span> · <span style="color:${usageColor}">${usagePercent}%</span>`
        : '<span style="color:var(--bad)">未配置</span>'}
    </div>
  `;

  if (s.interactionHint) {
    const hint = document.createElement('div');
    hint.className = 'hud-hint';
    hint.textContent = s.interactionHint;
    root.appendChild(hint);
  }
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
  return s.replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' } as Record<string, string>)[c]!
  );
}
