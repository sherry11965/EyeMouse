import { REGIONS } from '../world/regions';
import type { RegionId, Vec2, WorldTime } from '../core/types';

const TILE = 16;

export function drawWorld(
  ctx: CanvasRenderingContext2D,
  regionId: RegionId,
  camera: Vec2,
  zoom: number,
  time: WorldTime,
  worldW: number,
  worldH: number
) {
  const screenW = ctx.canvas.width;
  const screenH = ctx.canvas.height;

  ctx.save();
  ctx.scale(zoom, zoom);
  ctx.translate(
    (screenW / zoom) / 2 - camera.x * TILE,
    (screenH / zoom) / 2 - camera.y * TILE
  );

  drawGround(ctx, regionId, worldW, worldH);
  drawInteractables(ctx, regionId);
  drawTimeOverlay(ctx, time, worldW, worldH);
  ctx.restore();
}

export function worldToScreen(pos: Vec2, camera: Vec2, zoom: number, canvasW: number, canvasH: number): Vec2 {
  return {
    x: (pos.x - camera.x) * TILE * zoom + canvasW / 2,
    y: (pos.y - camera.y) * TILE * zoom + canvasH / 2
  };
}

function drawGround(ctx: CanvasRenderingContext2D, regionId: RegionId, w: number, h: number) {
  const baseColor = REGIONS[regionId].bgColor;
  const accent = darken(baseColor, 0.15);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      ctx.fillStyle = (x + y) % 2 === 0 ? baseColor : accent;
      ctx.fillRect(x * TILE, y * TILE, TILE, TILE);
    }
  }

  ctx.fillStyle = 'rgba(255,255,255,0.03)';
  for (let y = 0; y < h; y++) {
    ctx.fillRect(0, y * TILE, w * TILE, 1);
  }
  for (let x = 0; x < w; x++) {
    ctx.fillRect(x * TILE, 0, 1, h * TILE);
  }

  const r = REGIONS[regionId];
  for (const obj of r.interactables) {
    const ox = obj.x * TILE;
    const oy = obj.y * TILE;
    const c = colorFor(obj.type);
    ctx.fillStyle = c.bg;
    ctx.fillRect(ox + 1, oy + 1, TILE - 2, TILE - 2);
    ctx.fillStyle = c.border;
    ctx.fillRect(ox + 1, oy + 1, TILE - 2, 1);
    ctx.fillRect(ox + 1, oy + 1, 1, TILE - 2);
    ctx.fillStyle = c.highlight;
    ctx.fillRect(ox + 2, oy + 2, 2, 2);
  }

  if (regionId === 'plaza') {
    const fx = 14 * TILE, fy = 9 * TILE;
    ctx.fillStyle = '#0ea5e9';
    ctx.fillRect(fx + 2, fy + 2, 12, 12);
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(fx + 4, fy + 4, 8, 8);
    ctx.fillStyle = '#bae6fd';
    ctx.fillRect(fx + 6, fy + 6, 4, 4);
  } else if (regionId === 'seaside') {
    ctx.fillStyle = '#0c4a6e';
    for (let x = 18; x < 26; x++) ctx.fillRect(x * TILE, 6 * TILE, TILE, 12 * TILE);
    ctx.fillStyle = '#38bdf8';
    for (let x = 18; x < 26; x += 2) ctx.fillRect(x * TILE + 4, 7 * TILE + 4, 6, 2);
  } else if (regionId === 'forest') {
    for (let i = 0; i < 25; i++) {
      const tx = (i * 11 + i * i * 3) % 26;
      const ty = (i * 17 + i * 5) % 20;
      ctx.fillStyle = '#0f3a2f';
      ctx.fillRect(tx * TILE, ty * TILE, TILE, TILE);
      ctx.fillStyle = '#1e6b50';
      ctx.fillRect(tx * TILE + 3, ty * TILE + 3, 10, 10);
    }
  } else if (regionId === 'farm') {
    ctx.fillStyle = '#5c3a10';
    for (let x = 8; x <= 18; x += 2)
      for (let y = 6; y <= 14; y += 2)
        ctx.fillRect(x * TILE + 2, y * TILE + 2, 12, 12);
    ctx.fillStyle = '#fde68a';
    ctx.fillRect(11 * TILE + 5, 9 * TILE + 5, 6, 6);
    ctx.fillRect(15 * TILE + 5, 11 * TILE + 5, 6, 6);
  } else if (regionId === 'shops') {
    for (const s of REGIONS.shops.interactables) {
      ctx.fillStyle = '#4a2510';
      ctx.fillRect(s.x * TILE - 4, s.y * TILE - 10, TILE + 8, 14);
      ctx.fillStyle = '#fde68a';
      ctx.fillRect(s.x * TILE, s.y * TILE - 12, TILE, 3);
    }
  } else if (regionId === 'residential') {
    for (const h of REGIONS.residential.interactables.filter(i => i.type === 'home')) {
      ctx.fillStyle = '#6b3a18';
      ctx.fillRect(h.x * TILE - 6, h.y * TILE - 8, TILE + 12, 14);
      ctx.fillStyle = '#4a2510';
      ctx.fillRect(h.x * TILE - 7, h.y * TILE - 10, TILE + 14, 3);
      ctx.fillStyle = '#fde68a';
      ctx.fillRect(h.x * TILE + 4, h.y * TILE - 4, 4, 4);
    }
  }
}

function drawInteractables(_ctx: CanvasRenderingContext2D, _regionId: RegionId) {}

function drawTimeOverlay(ctx: CanvasRenderingContext2D, t: WorldTime, w: number, h: number) {
  const pw = w * TILE, ph = h * TILE;
  const alpha = nightAlpha(t);
  if (alpha > 0) {
    ctx.fillStyle = `rgba(10, 15, 40, ${alpha})`;
    ctx.fillRect(0, 0, pw, ph);
  }
  if (t.weather === 'rain' || t.weather === 'storm') {
    ctx.fillStyle = 'rgba(125,211,252,0.5)';
    const seed = Math.floor(t.minutes * 13);
    for (let i = 0; i < 60; i++) {
      ctx.fillRect(((i * 53 + seed) % pw), ((i * 97 + seed * 3) % ph), 1, 3);
    }
  }
  if (t.weather === 'fog') {
    ctx.fillStyle = 'rgba(226,232,240,0.15)';
    ctx.fillRect(0, 0, pw, ph);
  }
}

function nightAlpha(t: WorldTime): number {
  const m = t.minutes;
  if (m < 6 * 60 || m > 19.5 * 60) return 0.5;
  if (m < 7 * 60) return 0.5 * (1 - (m - 360) / 60);
  if (m > 18.5 * 60) return 0.5 * ((m - 1110) / 60);
  return 0;
}

function colorFor(type: string) {
  switch (type) {
    case 'landmark': return { bg: '#7c3aed', border: '#5b21b6', highlight: '#c4b5fd' };
    case 'board':    return { bg: '#b45309', border: '#78350f', highlight: '#fde68a' };
    case 'stall':    return { bg: '#be185d', border: '#831843', highlight: '#fda4af' };
    case 'bench':    return { bg: '#92400e', border: '#451a03', highlight: '#d97706' };
    case 'gather':   return { bg: '#065f46', border: '#064e3b', highlight: '#34d399' };
    case 'shop':     return { bg: '#6d28d9', border: '#4c1d95', highlight: '#a78bfa' };
    case 'field':    return { bg: '#65a30d', border: '#3f6212', highlight: '#bef264' };
    case 'dock':     return { bg: '#1e40af', border: '#1e3a8a', highlight: '#60a5fa' };
    default:         return { bg: '#64748b', border: '#475569', highlight: '#94a3b8' };
  }
}

function darken(hex: string, amount: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  let r = (num >> 16) & 0xff, g = (num >> 8) & 0xff, b = num & 0xff;
  r = Math.max(0, Math.floor(r * (1 - amount)));
  g = Math.max(0, Math.floor(g * (1 - amount)));
  b = Math.max(0, Math.floor(b * (1 - amount)));
  return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
}
