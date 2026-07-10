import type { MapObject, ObjectType, BiomeType, Vec2, Size, Building } from './types';

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

  chance(probability: number): boolean {
    return this.next() < probability;
  }
}

const BIOME_OBJECTS: Record<BiomeType, ObjectType[]> = {
  forest: ['tree', 'tree', 'tree', 'bush', 'rock', 'flower'],
  plains: ['tree', 'bush', 'flower', 'flower', 'rock'],
  desert: ['rock', 'rock', 'rock', 'bush'],
  mountain: ['rock', 'rock', 'tree', 'bush'],
  coastal: ['rock', 'rock', 'tree', 'driftwood' as ObjectType],
  swamp: ['tree', 'bush', 'bush', 'rock'],
  tundra: ['rock', 'rock', 'tree', 'bush'],
  volcanic: ['rock', 'rock', 'rock']
};

const OBJECT_DENSITY: Record<BiomeType, number> = {
  forest: 0.15,
  plains: 0.05,
  desert: 0.03,
  mountain: 0.08,
  coastal: 0.06,
  swamp: 0.12,
  tundra: 0.04,
  volcanic: 0.05
};

export function generateObjects(
  biome: BiomeType,
  seed: number,
  size: Size,
  buildings: Building[]
): MapObject[] {
  const rng = new SeededRandom(seed);
  const objects: MapObject[] = [];
  const objectTypes = BIOME_OBJECTS[biome] || ['tree', 'rock'];
  const density = OBJECT_DENSITY[biome] || 0.05;

  const occupied = new Set<string>();

  for (const b of buildings) {
    for (let dy = -1; dy <= b.size.h; dy++) {
      for (let dx = -1; dx <= b.size.w; dx++) {
        const tx = b.pos.x + dx;
        const ty = b.pos.y + dy;
        if (tx >= 0 && tx < size.w && ty >= 0 && ty < size.h) {
          occupied.add(`${tx},${ty}`);
        }
      }
    }
  }

  const targetCount = Math.floor(size.w * size.h * density);

  for (let i = 0; i < targetCount; i++) {
    const x = rng.nextInt(0, size.w - 1);
    const y = rng.nextInt(0, size.h - 1);
    const key = `${x},${y}`;

    if (occupied.has(key)) continue;

    const type = rng.pick(objectTypes);
    const variant = rng.nextInt(0, 3);

    objects.push({
      id: `obj_${i}`,
      type,
      pos: { x, y },
      variant,
      interactable: type === 'chest' || type === 'sign'
    });

    occupied.add(key);
  }

  return objects;
}

export function getObjectAt(objects: MapObject[], x: number, y: number): MapObject | null {
  for (const obj of objects) {
    if (obj.pos.x === x && obj.pos.y === y) {
      return obj;
    }
  }
  return null;
}

export function isWalkable(objects: MapObject[], x: number, y: number): boolean {
  const obj = getObjectAt(objects, x, y);
  if (!obj) return true;

  const blockingTypes: ObjectType[] = ['tree', 'rock', 'bush'];
  return !blockingTypes.includes(obj.type);
}
