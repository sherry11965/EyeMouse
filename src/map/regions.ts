import type { 
  Region, BiomeType, Tile, Vec2, Size 
} from './types';
import { generateTile } from './generator';
import { generateBuildings } from './buildings';
import { generateObjects } from './objects';
import { generateInteractables } from './interactables';

class SeededRandom {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  next(): number {
    this.seed = (this.seed * 1664525 + 1013904223) & 0xffffffff;
    return (this.seed >>> 0) / 0xffffffff;
  }

  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  pick<T>(arr: T[]): T {
    return arr[this.nextInt(0, arr.length - 1)];
  }
}

export class NoiseGenerator {
  private perm: number[];

  constructor(seed: number) {
    const rng = new SeededRandom(seed);
    this.perm = Array.from({ length: 256 }, (_, i) => i);
    for (let i = 255; i > 0; i--) {
      const j = rng.nextInt(0, i);
      [this.perm[i], this.perm[j]] = [this.perm[j], this.perm[i]];
    }
    this.perm = [...this.perm, ...this.perm];
  }

  private fade(t: number): number {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  private lerp(a: number, b: number, t: number): number {
    return a + t * (b - a);
  }

  private grad(hash: number, x: number, y: number): number {
    const h = hash & 3;
    const u = h < 2 ? x : y;
    const v = h < 2 ? y : x;
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
  }

  noise2D(x: number, y: number): number {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    const xf = x - Math.floor(x);
    const yf = y - Math.floor(y);
    const u = this.fade(xf);
    const v = this.fade(yf);

    const aa = this.perm[this.perm[X] + Y];
    const ab = this.perm[this.perm[X] + Y + 1];
    const ba = this.perm[this.perm[X + 1] + Y];
    const bb = this.perm[this.perm[X + 1] + Y + 1];

    return this.lerp(
      this.lerp(this.grad(aa, xf, yf), this.grad(ba, xf - 1, yf), u),
      this.lerp(this.grad(ab, xf, yf - 1), this.grad(bb, xf - 1, yf - 1), u),
      v
    );
  }

  octaveNoise(x: number, y: number, octaves: number, persistence: number): number {
    let total = 0;
    let frequency = 1;
    let amplitude = 1;
    let maxValue = 0;

    for (let i = 0; i < octaves; i++) {
      total += this.noise2D(x * frequency, y * frequency) * amplitude;
      maxValue += amplitude;
      amplitude *= persistence;
      frequency *= 2;
    }

    return total / maxValue;
  }
}

export function generateRegion(
  id: string,
  name: string,
  biome: BiomeType,
  pos: Vec2,
  size: Size,
  seed: number,
  noise: NoiseGenerator
): Region {
  const tiles: Tile[][] = [];

  for (let y = 0; y < size.h; y++) {
    tiles[y] = [];
    for (let x = 0; x < size.w; x++) {
      tiles[y][x] = generateTile(noise, pos.x + x, pos.y + y, biome);
    }
  }

  const buildings = generateBuildings(biome, seed, size);
  const objects = generateObjects(biome, seed, size, buildings);
  const interactables = generateInteractables(biome, seed, buildings, objects);

  return {
    id,
    name,
    biome,
    pos,
    size,
    tiles,
    buildings,
    objects,
    interactables,
    connections: []
  };
}

export function getSpawnPoint(region: Region): Vec2 {
  const centerX = Math.floor(region.size.w / 2);
  const centerY = Math.floor(region.size.h / 2);

  for (let radius = 0; radius < 10; radius++) {
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const x = centerX + dx;
        const y = centerY + dy;
        if (x >= 0 && x < region.size.w && y >= 0 && y < region.size.h) {
          const tile = region.tiles[y][x];
          if (tile.walkable && !tile.buildingId && !tile.objectId) {
            return { x, y };
          }
        }
      }
    }
  }

  return { x: centerX, y: centerY };
}
