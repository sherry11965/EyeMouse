import { REGIONS } from '../world/regions';
import type { RegionId, Vec2, WorldTime } from '../core/types';
import { drawTerrainTile, drawBuildingTile, drawObjectTile } from './sprite';

const TILE = 16;

const TERRAIN = {
  grass: 0, dirt: 1, water: 2, stone: 3, sand: 4, darkGrass: 5
} as const;

const BUILDING = {
  wall: 0, roof: 1, door: 2, window: 3, woodFloor: 4
} as const;

const OBJECT = {
  tree: 0, flower: 1, fountain: 2, bench: 3, signpost: 4
} as const;

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
  drawRegionDecor(ctx, regionId, worldW, worldH);
  drawInteractables(ctx, regionId);
  drawTimeOverlay(ctx, time, worldW, worldH);
  ctx.restore();
}

function drawGround(ctx: CanvasRenderingContext2D, regionId: RegionId, w: number, h: number) {
  const base = regionBaseTerrain(regionId);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const t = (x + y) % 2 === 0 ? base : TERRAIN.grass;
      drawTerrainTile(ctx, t, x * TILE, y * TILE);
    }
  }
}

function regionBaseTerrain(id: RegionId): number {
  switch (id) {
    case 'plaza': return TERRAIN.stone;
    case 'residential': return TERRAIN.grass;
    case 'shops': return TERRAIN.dirt;
    case 'farm': return TERRAIN.dirt;
    case 'forest': return TERRAIN.darkGrass;
    case 'seaside': return TERRAIN.sand;
  }
}

function drawRegionDecor(ctx: CanvasRenderingContext2D, regionId: RegionId, w: number, h: number) {
  if (regionId === 'seaside') {
    for (let x = 18; x < w; x++) {
      for (let y = 6; y < h - 2; y++) {
        drawTerrainTile(ctx, TERRAIN.water, x * TILE, y * TILE);
      }
    }
  } else if (regionId === 'forest') {
    for (let i = 0; i < 20; i++) {
      const tx = (i * 11 + i * i * 3) % w;
      const ty = (i * 17 + i * 5) % h;
      drawObjectTile(ctx, OBJECT.tree, tx * TILE, ty * TILE);
    }
  } else if (regionId === 'farm') {
    for (let x = 8; x <= 18; x += 2) {
      for (let y = 6; y <= 14; y += 2) {
        drawTerrainTile(ctx, TERRAIN.dirt, x * TILE, y * TILE);
      }
    }
    drawObjectTile(ctx, OBJECT.flower, 11 * TILE, 9 * TILE);
    drawObjectTile(ctx, OBJECT.flower, 15 * TILE, 11 * TILE);
  } else if (regionId === 'plaza') {
    drawObjectTile(ctx, OBJECT.fountain, 14 * TILE, 9 * TILE);
    drawObjectTile(ctx, OBJECT.bench, 10 * TILE, 6 * TILE);
    drawObjectTile(ctx, OBJECT.bench, 18 * TILE, 6 * TILE);
    drawObjectTile(ctx, OBJECT.signpost, 4 * TILE, 4 * TILE);
  } else if (regionId === 'residential') {
    for (const h of REGIONS.residential.interactables.filter(i => i.type === 'home')) {
      drawBuildingTile(ctx, BUILDING.wall, h.x * TILE - 8, h.y * TILE - 12);
      drawBuildingTile(ctx, BUILDING.roof, h.x * TILE - 8, h.y * TILE - 28);
      drawBuildingTile(ctx, BUILDING.door, h.x * TILE, h.y * TILE);
    }
  } else if (regionId === 'shops') {
    for (const s of REGIONS.shops.interactables) {
      drawBuildingTile(ctx, BUILDING.wall, s.x * TILE - 4, s.y * TILE - 8);
      drawBuildingTile(ctx, BUILDING.roof, s.x * TILE - 4, s.y * TILE - 24);
      drawBuildingTile(ctx, BUILDING.window, s.x * TILE, s.y * TILE - 4);
    }
  }
}

function drawInteractables(ctx: CanvasRenderingContext2D, regionId: RegionId) {
  for (const obj of REGIONS[regionId].interactables) {
    if (['home', 'shop', 'field', 'dock'].includes(obj.type)) continue;
    drawObjectTile(ctx, OBJECT.signpost, obj.x * TILE, obj.y * TILE);
  }
}

function drawTimeOverlay(ctx: CanvasRenderingContext2D, t: WorldTime, w: number, h: number) {
  const pw = w * TILE, ph = h * TILE;
  const alpha = nightAlpha(t);
  if (alpha > 0) {
    ctx.fillStyle = `rgba(25, 25, 80, ${alpha})`;
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
  if (m < 6 * 60 || m > 19.5 * 60) return 0.1;
  if (m < 7 * 60) return 0.1 * (1 - (m - 360) / 60);
  if (m > 18.5 * 60) return 0.1 * ((m - 1110) / 60);
  return 0;
}
