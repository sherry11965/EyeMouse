import type { Direction, ResidentPersona } from '../core/types';
import { createSpriteAtlas } from './atlas';

const TILE = 16;
const COLS = 16;

let atlasCanvas: HTMLCanvasElement | null = null;
let atlasCtx: CanvasRenderingContext2D | null = null;

function ensureAtlas() {
  if (!atlasCanvas) {
    atlasCanvas = createSpriteAtlas();
    atlasCtx = atlasCanvas.getContext('2d')!;
  }
}

const charColorMap: Record<string, number> = {
  baker_pink: 0,
  mage_blue: 1,
  farmer_green: 2,
  sailor_red: 3,
  mage_purple: 4,
  knight_yellow: 5,
};

export function drawResident(
  ctx: CanvasRenderingContext2D,
  persona: ResidentPersona,
  screenX: number,
  screenY: number,
  dir: Direction,
  walkPhase: number,
  isPlayer = false
) {
  ensureAtlas();
  const charIdx = charColorMap[persona.spriteKey] ?? 0;
  const dirIdx = dirToIdx(dir);
  const frame = Math.floor(walkPhase * 4) % 4;
  const spriteIdx = charIdx * 16 + dirIdx * 4 + frame;

  const sx = (spriteIdx % COLS) * TILE;
  const sy = Math.floor(spriteIdx / COLS) * TILE;

  ctx.drawImage(atlasCanvas!, sx, sy, TILE, TILE, Math.round(screenX), Math.round(screenY), TILE, TILE);

  if (isPlayer) {
    ctx.strokeStyle = 'rgba(240,192,80,0.8)';
    ctx.lineWidth = 1;
    ctx.strokeRect(Math.round(screenX) + 0.5, Math.round(screenY) + 0.5, TILE - 1, TILE - 1);
  }
}

export function drawTerrainTile(
  ctx: CanvasRenderingContext2D,
  tileIdx: number,
  screenX: number,
  screenY: number
) {
  ensureAtlas();
  const idx = 96 + tileIdx;
  const sx = (idx % COLS) * TILE;
  const sy = Math.floor(idx / COLS) * TILE;
  ctx.drawImage(atlasCanvas!, sx, sy, TILE, TILE, Math.round(screenX), Math.round(screenY), TILE, TILE);
}

export function drawBuildingTile(
  ctx: CanvasRenderingContext2D,
  tileIdx: number,
  screenX: number,
  screenY: number
) {
  ensureAtlas();
  const idx = 102 + tileIdx;
  const sx = (idx % COLS) * TILE;
  const sy = Math.floor(idx / COLS) * TILE;
  ctx.drawImage(atlasCanvas!, sx, sy, TILE, TILE, Math.round(screenX), Math.round(screenY), TILE, TILE);
}

export function drawObjectTile(
  ctx: CanvasRenderingContext2D,
  tileIdx: number,
  screenX: number,
  screenY: number
) {
  ensureAtlas();
  const idx = 107 + tileIdx;
  const sx = (idx % COLS) * TILE;
  const sy = Math.floor(idx / COLS) * TILE;
  ctx.drawImage(atlasCanvas!, sx, sy, TILE, TILE, Math.round(screenX), Math.round(screenY), TILE, TILE);
}

function dirToIdx(d: Direction): number {
  return ({ down: 0, left: 1, right: 2, up: 3 } as Record<Direction, number>)[d];
}
