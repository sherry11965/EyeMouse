import type { WorldMap, Region, Tile, Building, MapObject, Interactable, Vec2 } from '../map/types';
import type { WorldTime } from '../core/types';
import { TERRAIN_COLORS } from '../map/types';
import { getBuildingAt } from '../map/buildings';
import { getObjectAt } from '../map/objects';
import { getInteractableAt } from '../map/interactables';

const TILE = 16;

const BUILDING_COLORS: Record<string, { wall: string; roof: string; door: string }> = {
  house: { wall: '#e8a090', roof: '#c080d0', door: '#8b6914' },
  shop: { wall: '#f0c0a0', roof: '#d090e0', door: '#8b6914' },
  tavern: { wall: '#d89080', roof: '#b070c0', door: '#6b4a25' },
  church: { wall: '#f0e0d0', roof: '#a060b0', door: '#5a3e1b' },
  castle: { wall: '#a0a8b0', roof: '#808890', door: '#4a3e2b' },
  barn: { wall: '#c08060', roof: '#a06040', door: '#6b4a25' },
  windmill: { wall: '#e0d0c0', roof: '#b09080', door: '#6b4a25' },
  lighthouse: { wall: '#f0f0f0', roof: '#e04040', door: '#4a3e2b' },
  tower: { wall: '#909aa0', roof: '#707a80', door: '#4a3e2b' },
  ruins: { wall: '#808080', roof: '#606060', door: '#4a3e2b' }
};

const OBJECT_COLORS: Record<string, string> = {
  tree: '#4ecb71',
  rock: '#a0a8b0',
  flower: '#ff6b6b',
  bush: '#5a9c4f',
  fence: '#a07840',
  sign: '#ffd93d',
  bench: '#907030',
  lamp: '#ffe080',
  chest: '#c08040',
  well: '#74b9ff',
  fountain: '#81ecec',
  statue: '#c0c8d0',
  bridge: '#a07840',
  dock: '#8b6914',
  boat: '#6b4a25'
};

const INTERACTABLE_COLORS: Record<string, string> = {
  door: '#8b6914',
  bed: '#ff9a76',
  chest: '#c08040',
  npc: '#ff7eb3',
  item: '#ffd93d',
  crafting: '#a0a8b0',
  storage: '#909aa0',
  portal: '#9b80f0',
  quest: '#ff6b6b',
  shop: '#4fc3f7'
};

export function drawWorld(
  ctx: CanvasRenderingContext2D,
  world: WorldMap,
  time: WorldTime
): void {
  drawBackground(ctx, world);

  for (const region of world.regions) {
    drawRegion(ctx, region);
  }

  drawTimeOverlay(ctx, time, world.bounds);
}

export function drawActiveRegionView(
  ctx: CanvasRenderingContext2D,
  region: Region,
  time: WorldTime,
  viewportW: number,
  viewportH: number
): void {
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(0, 0, viewportW, viewportH);

  const ox = region.pos.x;
  const oy = region.pos.y;

  for (let y = 0; y < region.size.h; y++) {
    for (let x = 0; x < region.size.w; x++) {
      const tile = region.tiles[y][x];
      const px = (x - ox) * TILE;
      const py = (y - oy) * TILE;

      drawTile(ctx, tile, px, py);

      const building = getBuildingAt(region.buildings, x, y);
      if (building) {
        drawBuildingTile(ctx, building, x, y, px, py);
      }

      const obj = getObjectAt(region.objects, x, y);
      if (obj) {
        drawObject(ctx, obj, px, py);
      }

      const interactable = getInteractableAt(region.interactables, x, y);
      if (interactable && !building) {
        drawInteractable(ctx, interactable, px, py);
      }
    }
  }

  ctx.strokeStyle = 'rgba(255,255,255,0.4)';
  ctx.lineWidth = 2;
  ctx.strokeRect(-ox * TILE, -oy * TILE, region.size.w * TILE, region.size.h * TILE);

  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  const nameW = ctx.measureText(region.name).width + 16;
  ctx.fillRect(-ox * TILE + 4, -oy * TILE + 4, nameW, 20);
  ctx.fillStyle = '#ffffff';
  ctx.font = '11px Zpix, monospace';
  ctx.fillText(region.name, -ox * TILE + 12, -oy * TILE + 18);

  drawTimeOverlay(ctx, time, { w: region.size.w, h: region.size.h });
}

function drawBackground(ctx: CanvasRenderingContext2D, world: WorldMap): void {
  ctx.fillStyle = '#87ceeb';
  ctx.fillRect(0, 0, world.bounds.w * TILE, world.bounds.h * TILE);
}

function drawRegion(ctx: CanvasRenderingContext2D, region: Region): void {
  const ox = region.pos.x;
  const oy = region.pos.y;

  for (let y = 0; y < region.size.h; y++) {
    for (let x = 0; x < region.size.w; x++) {
      const tile = region.tiles[y][x];
      const worldX = ox + x;
      const worldY = oy + y;

      drawTile(ctx, tile, worldX * TILE, worldY * TILE);

      const building = getBuildingAt(region.buildings, x, y);
      if (building) {
        drawBuildingTile(ctx, building, x, y, worldX * TILE, worldY * TILE);
      }

      const obj = getObjectAt(region.objects, x, y);
      if (obj) {
        drawObject(ctx, obj, worldX * TILE, worldY * TILE);
      }

      const interactable = getInteractableAt(region.interactables, x, y);
      if (interactable && !building) {
        drawInteractable(ctx, interactable, worldX * TILE, worldY * TILE);
      }
    }
  }

  drawRegionBorder(ctx, region);
  drawRegionName(ctx, region);
}

function drawTile(ctx: CanvasRenderingContext2D, tile: Tile, x: number, y: number): void {
  const baseColor = TERRAIN_COLORS[tile.terrain];
  ctx.fillStyle = baseColor;
  ctx.fillRect(x, y, TILE, TILE);

  const variation = (tile.elevation - 0.5) * 20;
  if (Math.abs(variation) > 2) {
    ctx.fillStyle = variation > 0 ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
    ctx.fillRect(x, y, TILE, TILE);
  }

  if (tile.terrain === 'water') {
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    const waveOffset = Math.sin((x + y) * 0.1) * 2;
    ctx.fillRect(x + 4 + waveOffset, y + 6, 8, 2);
  }
}

function drawBuildingTile(
  ctx: CanvasRenderingContext2D,
  building: Building,
  localX: number,
  localY: number,
  worldX: number,
  worldY: number
): void {
  const colors = BUILDING_COLORS[building.type] || BUILDING_COLORS.house;
  const isTop = localY < 2;
  const isBottom = localY >= building.size.h - 1;
  const isLeft = localX === 0;
  const isRight = localX === building.size.w - 1;
  const isDoor = isBottom && localX === Math.floor(building.size.w / 2);

  if (isDoor) {
    ctx.fillStyle = colors.door;
    ctx.fillRect(worldX, worldY, TILE, TILE);
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(worldX + 6, worldY + 4, 4, 8);
  } else if (isTop) {
    ctx.fillStyle = colors.roof;
    ctx.fillRect(worldX, worldY, TILE, TILE);
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.fillRect(worldX, worldY + TILE - 4, TILE, 4);
  } else {
    ctx.fillStyle = colors.wall;
    ctx.fillRect(worldX, worldY, TILE, TILE);

    if (!isTop && !isBottom && !isLeft && !isRight && (localX + localY) % 3 === 0) {
      ctx.fillStyle = '#87ceeb';
      ctx.fillRect(worldX + 4, worldY + 4, 8, 8);
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.fillRect(worldX + 4, worldY + 4, 8, 4);
    }
  }

  if (isLeft || isTop) {
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    ctx.fillRect(worldX, worldY, TILE, TILE);
  }
  if (isRight || isBottom) {
    ctx.fillStyle = 'rgba(0,0,0,0.1)';
    ctx.fillRect(worldX, worldY, TILE, TILE);
  }
}

function drawObject(ctx: CanvasRenderingContext2D, obj: MapObject, x: number, y: number): void {
  const color = OBJECT_COLORS[obj.type] || '#808080';
  ctx.fillStyle = color;

  switch (obj.type) {
    case 'tree':
      ctx.fillStyle = '#8b6914';
      ctx.fillRect(x + 6, y + 10, 4, 6);
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x + 8, y + 6, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      ctx.beginPath();
      ctx.arc(x + 6, y + 4, 3, 0, Math.PI * 2);
      ctx.fill();
      break;

    case 'rock':
      ctx.beginPath();
      ctx.ellipse(x + 8, y + 10, 6, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      ctx.beginPath();
      ctx.ellipse(x + 6, y + 8, 3, 2, 0, 0, Math.PI * 2);
      ctx.fill();
      break;

    case 'flower':
      ctx.fillStyle = '#4ecb71';
      ctx.fillRect(x + 7, y + 8, 2, 6);
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x + 8, y + 6, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffd93d';
      ctx.beginPath();
      ctx.arc(x + 8, y + 6, 1.5, 0, Math.PI * 2);
      ctx.fill();
      break;

    case 'bush':
      ctx.beginPath();
      ctx.arc(x + 8, y + 10, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      ctx.beginPath();
      ctx.arc(x + 6, y + 8, 3, 0, Math.PI * 2);
      ctx.fill();
      break;

    default:
      ctx.fillRect(x + 2, y + 2, 12, 12);
  }
}

function drawInteractable(ctx: CanvasRenderingContext2D, interactable: Interactable, x: number, y: number): void {
  const color = INTERACTABLE_COLORS[interactable.type] || '#ffffff';
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.7;
  ctx.fillRect(x + 4, y + 4, 8, 8);
  ctx.globalAlpha = 1;

  if (interactable.type === 'quest') {
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 10px monospace';
    ctx.fillText('!', x + 6, y + 12);
  }
}

function drawRegionBorder(ctx: CanvasRenderingContext2D, region: Region): void {
  ctx.strokeStyle = 'rgba(255,255,255,0.3)';
  ctx.lineWidth = 2;
  ctx.strokeRect(
    region.pos.x * TILE,
    region.pos.y * TILE,
    region.size.w * TILE,
    region.size.h * TILE
  );
}

function drawRegionName(ctx: CanvasRenderingContext2D, region: Region): void {
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(
    region.pos.x * TILE + 4,
    region.pos.y * TILE + 4,
    ctx.measureText(region.name).width + 12,
    16
  );
  ctx.fillStyle = '#ffffff';
  ctx.font = '10px monospace';
  ctx.fillText(region.name, region.pos.x * TILE + 10, region.pos.y * TILE + 16);
}

function drawTimeOverlay(ctx: CanvasRenderingContext2D, time: WorldTime, bounds: { w: number; h: number }): void {
  const alpha = getNightAlpha(time);
  if (alpha > 0) {
    ctx.fillStyle = `rgba(25,25,80,${alpha})`;
    ctx.fillRect(0, 0, bounds.w * TILE, bounds.h * TILE);
  }

  if (time.weather === 'rain' || time.weather === 'storm') {
    ctx.fillStyle = 'rgba(125,211,252,0.3)';
    const seed = Math.floor(time.minutes * 13);
    for (let i = 0; i < 80; i++) {
      const rx = ((i * 53 + seed) % (bounds.w * TILE));
      const ry = ((i * 97 + seed * 3) % (bounds.h * TILE));
      ctx.fillRect(rx, ry, 1, 4);
    }
  }

  if (time.weather === 'fog') {
    ctx.fillStyle = 'rgba(226,232,240,0.15)';
    ctx.fillRect(0, 0, bounds.w * TILE, bounds.h * TILE);
  }

  if (time.weather === 'snow') {
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    const seed = Math.floor(time.minutes * 7);
    for (let i = 0; i < 60; i++) {
      const sx = ((i * 71 + seed) % (bounds.w * TILE));
      const sy = ((i * 113 + seed * 2) % (bounds.h * TILE));
      ctx.fillRect(sx, sy, 2, 2);
    }
  }
}

function getNightAlpha(time: WorldTime): number {
  const m = time.minutes;
  if (m < 6 * 60 || m > 19.5 * 60) return 0.15;
  if (m < 7 * 60) return 0.15 * (1 - (m - 360) / 60);
  if (m > 18.5 * 60) return 0.15 * ((m - 1110) / 60);
  return 0;
}

export function worldToScreen(worldPos: Vec2, camera: Vec2, zoom: number, canvas: { width: number; height: number }): Vec2 {
  return {
    x: (worldPos.x - camera.x) * TILE * zoom + canvas.width / 2,
    y: (worldPos.y - camera.y) * TILE * zoom + canvas.height / 2
  };
}

export function screenToWorld(screenPos: Vec2, camera: Vec2, zoom: number, canvas: { width: number; height: number }): Vec2 {
  return {
    x: (screenPos.x - canvas.width / 2) / (TILE * zoom) + camera.x,
    y: (screenPos.y - canvas.height / 2) / (TILE * zoom) + camera.y
  };
}
