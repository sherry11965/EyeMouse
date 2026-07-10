import type { Region, Vec2 } from '../map/types';
import { getRegion, getAllRegions, getSpawnForRegion } from './worldState';
import type { WorldTime } from '../core/types';

const TRANSITION_DURATION = 800;

let _activeRegionId: string | null = null;
let _transitioning = false;
let _transitionStart = 0;
let _transitionFrom: string | null = null;
let _transitionTo: string | null = null;
let _onTransitionMid: ((regionId: string) => void) | null = null;
let _onTransitionStart: ((regionId: string, regionName: string) => void) | null = null;

export function initActiveRegion(regionId: string): void {
  _activeRegionId = regionId;
}

export function getActiveRegionId(): string | null {
  return _transitionTo ?? _activeRegionId;
}

export function getActiveRegion(): Region | null {
  const id = getActiveRegionId();
  return id ? getRegion(id) : null;
}

export function isTransitioning(): boolean {
  return _transitioning;
}

export function switchMap(targetRegionId: string, onMid?: () => void): void {
  if (_transitioning) return;
  if (targetRegionId === _activeRegionId) return;

  const target = getRegion(targetRegionId);
  if (!target) return;

  _transitioning = true;
  _transitionStart = performance.now();
  _transitionFrom = _activeRegionId;
  _transitionTo = targetRegionId;
  _onTransitionMid = onMid ?? null;

  _onTransitionStart?.(targetRegionId, target.name);

  setTimeout(() => {
    if (_transitionTo === targetRegionId) {
      _activeRegionId = targetRegionId;
      _onTransitionMid?.(targetRegionId);
    }
  }, TRANSITION_DURATION / 2);

  setTimeout(() => {
    if (_transitionTo === targetRegionId) {
      _transitioning = false;
      _transitionFrom = null;
      _transitionTo = null;
      _onTransitionMid = null;
    }
  }, TRANSITION_DURATION);
}

export function setTransitionCallbacks(cbs: {
  onStart?: (regionId: string, regionName: string) => void;
}): void {
  _onTransitionStart = cbs.onStart ?? null;
}

export function checkBoundaryTransition(
  playerPos: Vec2,
  agentIds: string[],
  moveAgents: (regionId: string, target: Vec2, agentIds: string[]) => void
): boolean {
  if (_transitioning) return false;
  const region = getActiveRegion();
  if (!region) return false;

  const margin = 0.3;
  const localX = playerPos.x - region.pos.x;
  const localY = playerPos.y - region.pos.y;

  let dir: 'left' | 'right' | 'up' | 'down' | null = null;
  if (localX < margin) dir = 'left';
  else if (localX > region.size.w - margin) dir = 'right';
  else if (localY < margin) dir = 'up';
  else if (localY > region.size.h - margin) dir = 'down';

  if (!dir) return false;

  const targetId = findAdjacentRegion(region.id, dir);
  if (!targetId) return false;

  const target = getRegion(targetId);
  if (!target) return false;

  const entry = getEntryPoint(target, dir);

  switchMap(targetId, () => {
    moveAgents(targetId, entry, agentIds);
  });

  return true;
}

function findAdjacentRegion(fromId: string, direction: 'left' | 'right' | 'up' | 'down'): string | null {
  const from = getRegion(fromId);
  if (!from) return null;

  const regions = getAllRegions();
  const fromCol = Math.round(from.pos.x / 52);
  const fromRow = Math.round(from.pos.y / 40);

  const delta: Record<string, [number, number]> = {
    left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1]
  };
  const [dc, dr] = delta[direction];
  const targetCol = fromCol + dc;
  const targetRow = fromRow + dr;

  let best: Region | null = null;
  let bestDist = Infinity;

  for (const r of regions) {
    if (r.id === fromId) continue;
    const col = Math.round(r.pos.x / 52);
    const row = Math.round(r.pos.y / 40);
    if (col === targetCol && row === targetRow) {
      const dist = Math.abs(col - fromCol) + Math.abs(row - fromRow);
      if (dist < bestDist) {
        bestDist = dist;
        best = r;
      }
    }
  }

  return best?.id ?? null;
}

function getEntryPoint(region: Region, fromDirection: string): Vec2 {
  const cx = Math.floor(region.size.w / 2);
  const cy = Math.floor(region.size.h / 2);
  const m = 2;

  switch (fromDirection) {
    case 'right': return { x: m, y: cy };
    case 'left': return { x: region.size.w - m - 1, y: cy };
    case 'down': return { x: cx, y: m };
    case 'up': return { x: cx, y: region.size.h - m - 1 };
    default: return { x: cx, y: cy };
  }
}

export function findNearbyPortal(regionId: string, localPos: Vec2, radius: number = 2): { id: string; label: string } | null {
  const region = getRegion(regionId);
  if (!region) return null;

  for (const i of region.interactables) {
    if (i.type === 'portal') {
      const dx = Math.abs(i.pos.x - localPos.x);
      const dy = Math.abs(i.pos.y - localPos.y);
      if (dx <= radius && dy <= radius) {
        return { id: i.id, label: i.label };
      }
    }
  }
  return null;
}

export function showMapSelection(): void {
  if (_transitioning) return;

  const root = document.getElementById('modal-root');
  if (!root || root.firstElementChild) return;

  const regions = getAllRegions();
  const currentId = _activeRegionId;

  const wrap = document.createElement('div');
  const regionButtons = regions.map(r => {
    const isCurrent = r.id === currentId;
    const biomeEmoji: Record<string, string> = {
      forest: '🌲', plains: '🌾', desert: '🏜️', mountain: '⛰️',
      coastal: '🏖️', swamp: '🌿', tundra: '❄️', volcanic: '🌋'
    };
    const emoji = biomeEmoji[r.biome] || '🗺️';
    return `<button class="nes-btn map-region-btn${isCurrent ? ' is-primary' : ''}" 
      data-region="${r.id}" ${isCurrent ? 'disabled' : ''}>
      ${emoji} ${r.name}${isCurrent ? ' (当前)' : ''}
    </button>`;
  }).join('');

  wrap.innerHTML = `<div class="modal-backdrop"><section class="nes-container is-dark with-title modal-card">
    <p class="title">选择目的地</p>
    <div class="map-region-list">${regionButtons}</div>
    <div class="modal-row" style="margin-top:12px">
      <button class="nes-btn" id="close-map-menu">取消</button>
    </div></section></div>`;

  root.appendChild(wrap);

  wrap.querySelector('#close-map-menu')!.addEventListener('click', () => wrap.remove());

  wrap.querySelectorAll('.map-region-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = (btn as HTMLElement).dataset.region;
      if (!targetId || targetId === currentId) return;
      wrap.remove();
      switchMap(targetId);
    });
  });
}

export function drawTransitionOverlay(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  _time: WorldTime
): void {
  if (!_transitioning) return;

  const elapsed = performance.now() - _transitionStart;
  const progress = Math.min(1, elapsed / TRANSITION_DURATION);

  let alpha: number;
  if (progress < 0.5) {
    alpha = progress * 2;
  } else {
    alpha = 1 - (progress - 0.5) * 2;
  }

  ctx.fillStyle = `rgba(0,0,0,${alpha * 0.85})`;
  ctx.fillRect(0, 0, width, height);

  if (progress > 0.25 && progress < 0.75) {
    const target = _transitionTo ? getRegion(_transitionTo) : null;
    if (target) {
      const textAlpha = 1 - Math.abs(progress - 0.5) * 4;
      ctx.globalAlpha = Math.max(0, Math.min(1, textAlpha));
      ctx.fillStyle = '#ffffff';
      ctx.font = '14px Zpix, monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`前往 ${target.name}...`, width / 2, height / 2);
      ctx.textAlign = 'start';
      ctx.globalAlpha = 1;
    }
  }
}
