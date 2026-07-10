import { personaColor } from './palettes';
import type { Direction, ResidentPersona } from '../core/types';

const TILE = 16;
const FRAME = 4;
const FRAMES_WALK = 4;
const FRAMES_IDLE = 2;

type SpriteCache = Map<string, HTMLCanvasElement>;
const cache: SpriteCache = new Map();

export function drawResident(
  ctx: CanvasRenderingContext2D,
  persona: ResidentPersona,
  screenX: number,
  screenY: number,
  dir: Direction,
  walkPhase: number,
  isPlayer = false
): void {
  const key = persona.spriteKey + ':' + persona.id;
  let sprite = cache.get(key);
  if (!sprite) {
    sprite = buildSprite(persona);
    cache.set(key, sprite);
  }
  const row = dirRow(dir);
  const frames = walkPhase > 0 ? FRAMES_WALK : FRAMES_IDLE;
  const f = Math.floor(walkPhase * frames) % frames;
  const sx = f * TILE;
  const sy = row * TILE;
  ctx.drawImage(sprite, sx, sy, TILE, TILE, Math.round(screenX), Math.round(screenY), TILE, TILE);
  if (isPlayer) {
    ctx.strokeStyle = 'rgba(253,230,138,0.9)';
    ctx.lineWidth = 1;
    ctx.strokeRect(Math.round(screenX) + 0.5, Math.round(screenY) + 0.5, TILE - 1, TILE - 1);
  }
}

function dirRow(d: Direction): number {
  return ({ down: 0, left: 1, right: 2, up: 3 } as Record<Direction, number>)[d];
}

function buildSprite(p: ResidentPersona): HTMLCanvasElement {
  const w = TILE * 4;
  const h = TILE * 4;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d')!;
  const pal = personaColor(p);

  for (let dir = 0; dir < 4; dir++) {
    for (let f = 0; f < FRAMES_WALK; f++) {
      const ox = f * TILE;
      const oy = dir * TILE;
      const bob = (f === 1 || f === 3) ? -1 : 0;
      const legShift = f % 2 === 0 ? 0 : 1;
      drawHead(g, ox, oy + bob, pal);
      drawBody(g, ox, oy + bob, pal);
      drawLegs(g, ox, oy + bob, legShift, pal);
    }
    for (let f = 0; f < FRAMES_IDLE; f++) {
      const ox = (FRAMES_WALK + f) * TILE;
      const oy = dir * TILE;
      drawHead(g, ox, oy, pal);
      drawBody(g, ox, oy, pal);
      drawLegs(g, ox, oy, 0, pal);
    }
  }
  return c;
}

function drawHead(g: CanvasRenderingContext2D, ox: number, oy: number, pal: ReturnType<typeof personaColor>) {
  g.fillStyle = pal.skin;
  g.fillRect(ox + 5, oy + 2, 6, 6);
  g.fillStyle = pal.hair;
  g.fillRect(ox + 5, oy + 1, 6, 2);
  g.fillStyle = '#0a0f1e';
  g.fillRect(ox + 6, oy + 5, 1, 1);
  g.fillRect(ox + 9, oy + 5, 1, 1);
}

function drawBody(g: CanvasRenderingContext2D, ox: number, oy: number, pal: ReturnType<typeof personaColor>) {
  g.fillStyle = pal.shirt;
  g.fillRect(ox + 4, oy + 8, 8, 5);
  g.fillStyle = pal.skin;
  g.fillRect(ox + 3, oy + 8, 1, 4);
  g.fillRect(ox + 12, oy + 8, 1, 4);
}

function drawLegs(g: CanvasRenderingContext2D, ox: number, oy: number, shift: number, pal: ReturnType<typeof personaColor>) {
  g.fillStyle = pal.pants;
  if (shift) {
    g.fillRect(ox + 5, oy + 13, 2, 3);
    g.fillRect(ox + 9, oy + 13, 2, 3);
  } else {
    g.fillRect(ox + 6, oy + 13, 2, 3);
    g.fillRect(ox + 8, oy + 13, 2, 3);
  }
}
