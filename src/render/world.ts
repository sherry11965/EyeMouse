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
  const region = REGIONS[regionId];
  const cw = ctx.canvas.width / zoom;
  const ch = ctx.canvas.height / zoom;
  ctx.save();
  ctx.scale(zoom, zoom);
  ctx.translate(-camera.x + cw / 2, -camera.y + ch / 2);

  drawGround(ctx, regionId, worldW, worldH);
  drawInteractables(ctx, regionId);
  drawTimeOverlay(ctx, time, worldW, worldH);
  ctx.restore();
}

function drawGround(ctx: CanvasRenderingContext2D, regionId: RegionId, w: number, h: number) {
  const baseColor = REGIONS[regionId].bgColor;
  const accent = darken(baseColor, 0.25);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const checker = (x + y) % 2 === 0 ? baseColor : accent;
      ctx.fillStyle = checker;
      ctx.fillRect(x * TILE, y * TILE, TILE, TILE);
    }
  }
  ctx.fillStyle = 'rgba(0,0,0,0.07)';
  for (let y = 0; y < h; y += 2) ctx.fillRect(0, y * TILE, w * TILE, 1);

  // region-specific decorations
  if (regionId === 'plaza') {
    // fountain
    const fx = 14 * TILE, fy = 9 * TILE;
    ctx.fillStyle = '#7dd3fc';
    ctx.fillRect(fx + 4, fy + 4, 8, 8);
    ctx.fillStyle = '#0ea5e9';
    ctx.fillRect(fx + 6, fy + 6, 4, 4);
    ctx.fillStyle = '#bae6fd';
    ctx.fillRect(fx + 7, fy + 7, 1, 1);
  } else if (regionId === 'forest') {
    for (let i = 0; i < 30; i++) {
      const x = (i * 13 + (i * i * 3)) % (26 * TILE);
      const y = (i * 17) % (20 * TILE);
      ctx.fillStyle = '#0f3a2f';
      ctx.fillRect(x, y, TILE, TILE);
      ctx.fillStyle = '#1e6b50';
      ctx.fillRect(x + 4, y + 6, 8, 8);
      ctx.fillStyle = '#34d399';
      ctx.fillRect(x + 6, y + 4, 4, 4);
    }
  } else if (regionId === 'farm') {
    ctx.fillStyle = '#7c4f1d';
    for (let x = 8; x <= 18; x += 2) for (let y = 6; y <= 14; y += 2) ctx.fillRect(x * TILE, y * TILE, TILE, TILE);
    ctx.fillStyle = '#fde68a';
    ctx.fillRect(11 * TILE + 6, 9 * TILE + 6, 3, 3);
    ctx.fillRect(15 * TILE + 6, 11 * TILE + 6, 3, 3);
  } else if (regionId === 'seaside') {
    ctx.fillStyle = '#0c4a6e';
    for (let x = 18; x < 26; x++) ctx.fillRect(x * TILE, 6 * TILE, TILE, 12 * TILE);
    ctx.fillStyle = '#38bdf8';
    for (let x = 18; x < 26; x++) ctx.fillRect(x * TILE + 6, 7 * TILE + 4 + (x % 2) * 4, 4, 1);
    ctx.fillStyle = '#fde68a';
    ctx.fillRect(24 * TILE + 6, 4 * TILE, 4, 16);
  } else if (regionId === 'shops') {
    ctx.fillStyle = '#7c2d12';
    for (const s of REGIONS.shops.interactables) ctx.fillRect(s.x * TILE - 4, s.y * TILE - 8, TILE + 8, 12);
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(4 * TILE + 3, 6 * TILE - 12, 2, 6);
    ctx.fillRect(10 * TILE + 3, 6 * TILE - 12, 2, 6);
    ctx.fillRect(18 * TILE + 3, 6 * TILE - 12, 2, 6);
  } else if (regionId === 'residential') {
    ctx.fillStyle = '#92400e';
    for (const h of REGIONS.residential.interactables.filter(i => i.type === 'home')) {
      ctx.fillRect(h.x * TILE - 6, h.y * TILE - 8, TILE + 12, 14);
      ctx.fillStyle = '#78350f';
      ctx.fillRect(h.x * TILE - 7, h.y * TILE - 10, TILE + 14, 3);
      ctx.fillStyle = '#92400e';
    }
  }
}

function drawInteractables(ctx: CanvasRenderingContext2D, regionId: RegionId) {
  for (const obj of REGIONS[regionId].interactables) {
    if (['home', 'shop', 'field', 'dock'].includes(obj.type)) continue;
    const x = obj.x * TILE;
    const y = obj.y * TILE;
    const c = interactableColor(obj.type);
    ctx.fillStyle = c.fill;
    ctx.fillRect(x + 2, y + 2, TILE - 4, TILE - 4);
    ctx.fillStyle = c.border;
    ctx.fillRect(x + 2, y + 2, TILE - 4, 2);
    ctx.fillRect(x + 2, y + 2, 2, TILE - 4);
  }
}

function interactableColor(type: string) {
  switch (type) {
    case 'board': return { fill: '#fde68a', border: '#92400e' };
    case 'stall': return { fill: '#fb7185', border: '#831843' };
    case 'bench': return { fill: '#a16207', border: '#451a03' };
    case 'landmark': return { fill: '#c4b5fd', border: '#4c1d95' };
    case 'gather': return { fill: '#86efac', border: '#14532d' };
    default: return { fill: '#94a3b8', border: '#1e293b' };
  }
}

function drawTimeOverlay(ctx: CanvasRenderingContext2D, t: WorldTime, w: number, h: number) {
  const px = w * TILE, py = h * TILE;
  const darkness = nightAlpha(t);
  if (darkness > 0) {
    ctx.fillStyle = `rgba(10, 15, 40, ${darkness})`;
    ctx.fillRect(0, 0, px, py);
  }
  if (t.weather === 'rain' || t.weather === 'storm') {
    ctx.fillStyle = 'rgba(125,211,252,0.6)';
    const seed = Math.floor(t.minutes * 7);
    for (let i = 0; i < 80; i++) {
      const x = ((i * 53 + seed) % px);
      const y = ((i * 91 + seed * 2) % py);
      ctx.fillRect(x, y, 1, 4);
    }
  }
  if (t.weather === 'fog') {
    ctx.fillStyle = 'rgba(226,232,240,0.18)';
    ctx.fillRect(0, 0, px, py);
  }
}

function nightAlpha(t: WorldTime): number {
  const minutes = t.minutes;
  if (minutes < 6 * 60 || minutes > 19.5 * 60) return 0.55;
  if (minutes < 7 * 60) return 0.55 * (1 - (minutes - 6 * 60) / 60);
  if (minutes > 18.5 * 60) return 0.55 * ((minutes - 18.5 * 60) / 60);
  return 0;
}

function darken(hex: string, amount: number): string {
  const c = hex.replace('#', '');
  const num = parseInt(c, 16);
  let r = (num >> 16) & 0xff, g = (num >> 8) & 0xff, b = num & 0xff;
  r = Math.max(0, Math.floor(r * (1 - amount)));
  g = Math.max(0, Math.floor(g * (1 - amount)));
  b = Math.max(0, Math.floor(b * (1 - amount)));
  return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
}
