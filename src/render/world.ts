import type { GeneratedWorld, RegionTerrainType, WorldTime } from '../core/types';
import { getAllRegions, getWorldBounds } from '../world/worldState';
import { drawTerrainTile, drawBuildingTile, drawObjectTile } from './sprite';

const TILE = 16;

const T = { grass: 0, dirt: 1, water: 2, stone: 3, sand: 4, darkGrass: 5 } as const;
const B = { wall: 0, roof: 1, door: 2, window: 3, woodFloor: 4 } as const;
const O = { tree: 0, flower: 1, fountain: 2, bench: 3, signpost: 4 } as const;

export function drawWorld(
  ctx: CanvasRenderingContext2D,
  camera: { x: number; y: number },
  zoom: number,
  time: WorldTime
) {
  const screenW = ctx.canvas.width;
  const screenH = ctx.canvas.height;

  ctx.save();
  ctx.scale(zoom, zoom);
  ctx.translate(
    (screenW / zoom) / 2 - camera.x * TILE,
    (screenH / zoom) / 2 - camera.y * TILE
  );

  const bounds = getWorldBounds();

  // 全世界底色（道路/空隙）
  for (let y = 0; y < bounds.h; y++) {
    for (let x = 0; x < bounds.w; x++) {
      drawTerrainTile(ctx, T.stone, x * TILE, y * TILE);
    }
  }

  const regions = getAllRegions();

  // 各区域地面
  for (const r of regions) {
    const ox = r.worldOffset.x, oy = r.worldOffset.y;
    const base = terrainBase(r.terrainType);
    const alt = terrainAlt(r.terrainType);
    for (let ty = 0; ty < r.size.h; ty++) {
      for (let tx = 0; tx < r.size.w; tx++) {
        drawTerrainTile(ctx, (tx + ty) % 2 === 0 ? base : alt,
          (ox + tx) * TILE, (oy + ty) * TILE);
      }
    }
  }

  // 各区域装饰
  for (const r of regions) {
    drawRegionDecor(ctx, r.terrainType, r.worldOffset.x, r.worldOffset.y, r.size.w, r.size.h);
    // 区域内可交互对象（路牌标记）
    for (const obj of r.interactables) {
      if (obj.type !== 'home' && obj.type !== 'shop' && obj.type !== 'dock') {
        drawObjectTile(ctx, O.signpost,
          (r.worldOffset.x + obj.x) * TILE,
          (r.worldOffset.y + obj.y) * TILE);
      }
    }
  }

  drawTimeOverlay(ctx, time);
  ctx.restore();
}

function terrainBase(t: RegionTerrainType): number {
  switch (t) {
    case 'plaza':    return T.stone;
    case 'market':   return T.stone;
    case 'village':  return T.grass;
    case 'farm':     return T.dirt;
    case 'forest':   return T.darkGrass;
    case 'seaside':  return T.sand;
    case 'ruins':    return T.stone;
    case 'mountain': return T.stone;
    case 'desert':   return T.sand;
    default:         return T.grass;
  }
}

function terrainAlt(t: RegionTerrainType): number {
  switch (t) {
    case 'plaza':    return T.stone;
    case 'market':   return T.dirt;
    case 'village':  return T.grass;
    case 'farm':     return T.grass;
    case 'forest':   return T.darkGrass;
    case 'seaside':  return T.sand;
    case 'ruins':    return T.dirt;
    case 'mountain': return T.dirt;
    case 'desert':   return T.dirt;
    default:         return T.grass;
  }
}

function drawRegionDecor(
  ctx: CanvasRenderingContext2D,
  type: RegionTerrainType,
  ox: number, oy: number, w: number, h: number
) {
  const px = (lx: number, ly: number): [number, number] =>
    [(ox + lx) * TILE, (oy + ly) * TILE];

  if (type === 'forest') {
    const trees = [
      [4,3],[8,6],[12,2],[16,8],[20,4],[24,10],[28,6],[32,3],[36,8],[40,4],
      [2,14],[6,18],[10,22],[14,16],[18,24],[22,28],[26,20],[30,30],[34,24],[38,28],
      [5,10],[13,20],[21,14],[29,18],[37,16],[9,28],[17,18],[25,24],[33,30],[41,26],
    ];
    for (const [tx, ty] of trees) if (tx < w && ty < h)
      drawObjectTile(ctx, O.tree, ...px(tx, ty));
    for (const [fx, fy] of [[3,6],[11,14],[19,22],[27,10],[35,20]])
      if (fx < w && fy < h) drawObjectTile(ctx, O.flower, ...px(fx, fy));
  }

  if (type === 'farm') {
    for (let fx = 8; fx <= Math.min(38, w - 4); fx += 2)
      for (let fy = 6; fy <= Math.min(16, h - 4); fy += 2)
        drawTerrainTile(ctx, T.dirt, (ox + fx) * TILE, (oy + fy) * TILE);
    for (let fx = 10; fx <= Math.min(36, w - 4); fx += 2)
      for (let fy = 18; fy <= Math.min(28, h - 4); fy += 2)
        drawTerrainTile(ctx, T.dirt, (ox + fx) * TILE, (oy + fy) * TILE);
    for (const [fx, fy] of [[11,9],[29,9],[15,23],[31,25]])
      if (fx < w && fy < h) drawObjectTile(ctx, O.flower, ...px(fx, fy));
  }

  if (type === 'village') {
    for (const [hx, hy] of [[4,4],[12,4],[22,4],[32,4],[6,22],[16,22],[28,22]])
      if (hx + 2 < w && hy + 2 < h) {
        drawBuildingTile(ctx, B.wall, ...px(hx - 1, hy - 1));
        drawBuildingTile(ctx, B.roof, ...px(hx - 1, hy - 3));
        drawBuildingTile(ctx, B.door, ...px(hx, hy));
      }
    for (const [tx, ty] of [[18,10],[22,10],[20,14],[24,12]])
      if (tx < w && ty < h) drawObjectTile(ctx, O.tree, ...px(tx, ty));
    drawObjectTile(ctx, O.bench, ...(px(20, 12)));
  }

  if (type === 'seaside') {
    for (let sx = Math.max(0, w - 18); sx < w; sx++)
      for (let sy = 4; sy < h; sy++)
        drawTerrainTile(ctx, T.water, (ox + sx) * TILE, (oy + sy) * TILE);
    for (let sx = Math.max(0, w - 22); sx < w - 18; sx++)
      for (let sy = 8; sy < h; sy++)
        drawTerrainTile(ctx, T.sand, (ox + sx) * TILE, (oy + sy) * TILE);
    const lhx = w - 2, lhy = 2;
    if (lhx < w && lhy < h) {
      drawBuildingTile(ctx, B.wall, ...px(lhx, lhy));
      drawBuildingTile(ctx, B.roof, ...px(lhx, lhy - 2));
    }
  }

  if (type === 'plaza') {
    const cx = Math.floor(w / 2), cy = Math.floor(h / 2);
    drawObjectTile(ctx, O.fountain, ...px(cx, cy));
    for (const [bx, by] of [[cx-10,cy-8],[cx-2,cy-8],[cx+8,cy+4],[cx-10,cy+8]])
      if (bx >= 0 && by >= 0 && bx < w && by < h)
        drawObjectTile(ctx, O.bench, ...px(bx, by));
    for (const [fx, fy] of [[cx-8,cy-2],[cx+4,cy-6],[cx+8,cy+2],[cx-4,cy+6]])
      if (fx >= 0 && fy >= 0 && fx < w && fy < h)
        drawObjectTile(ctx, O.flower, ...px(fx, fy));
  }

  if (type === 'market') {
    for (const [sx, sy] of [[4,4],[12,4],[22,4],[32,4],[8,18],[20,20],[34,24]])
      if (sx + 2 < w && sy + 2 < h) {
        drawBuildingTile(ctx, B.wall, ...px(sx, sy));
        drawBuildingTile(ctx, B.roof, ...px(sx, sy - 2));
        drawBuildingTile(ctx, B.window, ...px(sx + 1, sy - 1));
      }
    for (const [fx, fy] of [[10,12],[20,14],[30,12]])
      if (fx < w && fy < h) drawObjectTile(ctx, O.flower, ...px(fx, fy));
  }

  if (type === 'ruins') {
    for (const [rx, ry] of [[6,8],[14,12],[24,6],[32,16],[38,8],[10,22],[28,24]])
      if (rx < w && ry < h) drawBuildingTile(ctx, B.wall, ...px(rx, ry));
    for (const [tx, ty] of [[4,10],[18,8],[36,20],[12,26],[30,28]])
      if (tx < w && ty < h) drawObjectTile(ctx, O.tree, ...px(tx, ty));
  }

  if (type === 'mountain') {
    for (let y = 0; y < Math.min(8, h); y++)
      for (let x = 0; x < w; x++)
        drawTerrainTile(ctx, T.stone, (ox + x) * TILE, (oy + y) * TILE);
    for (const [tx, ty] of [[6,10],[14,12],[22,10],[30,14],[38,10]])
      if (tx < w && ty < h) drawObjectTile(ctx, O.tree, ...px(tx, ty));
  }

  if (type === 'desert') {
    for (const [cx2, cy2] of [[8,6],[20,14],[34,8],[12,22],[28,18],[40,24]])
      if (cx2 < w && cy2 < h) {
        for (let dy = -1; dy <= 1; dy++)
          for (let dx = -1; dx <= 1; dx++)
            if (cx2 + dx >= 0 && cy2 + dy >= 0 && cx2 + dx < w && cy2 + dy < h)
              drawTerrainTile(ctx, T.stone, (ox + cx2 + dx) * TILE, (oy + cy2 + dy) * TILE);
      }
  }
}

function drawTimeOverlay(ctx: CanvasRenderingContext2D, t: WorldTime) {
  const bounds = getWorldBounds();
  const pw = bounds.w * TILE, ph = bounds.h * TILE;
  const alpha = nightAlpha(t);
  if (alpha > 0) {
    ctx.fillStyle = `rgba(10,15,40,${alpha})`;
    ctx.fillRect(0, 0, pw, ph);
  }
  if (t.weather === 'rain' || t.weather === 'storm') {
    ctx.fillStyle = 'rgba(125,211,252,0.5)';
    const seed = Math.floor(t.minutes * 13);
    for (let i = 0; i < 80; i++)
      ctx.fillRect(((i * 53 + seed) % pw), ((i * 97 + seed * 3) % ph), 1, 3);
  }
  if (t.weather === 'fog') {
    ctx.fillStyle = 'rgba(226,232,240,0.18)'; ctx.fillRect(0, 0, pw, ph);
  }
  if (t.weather === 'snow') {
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    const seed = Math.floor(t.minutes * 7);
    for (let i = 0; i < 60; i++)
      ctx.fillRect(((i * 71 + seed) % pw), ((i * 113 + seed * 2) % ph), 2, 2);
  }
}

function nightAlpha(t: WorldTime): number {
  const m = t.minutes;
  if (m < 6 * 60 || m > 19.5 * 60) return 0.5;
  if (m < 7 * 60) return 0.5 * (1 - (m - 360) / 60);
  if (m > 18.5 * 60) return 0.5 * ((m - 1110) / 60);
  return 0;
}
