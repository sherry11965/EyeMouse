import type { Interactable, BiomeType, Building, MapObject } from './types';
import { pickLandmarksForBiome } from './landmarks';

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
}

export function generateInteractables(
  biome: BiomeType,
  seed: number,
  buildings: Building[],
  objects: MapObject[]
): Interactable[] {
  const rng = new SeededRandom(seed);
  const interactables: Interactable[] = [];

  for (const building of buildings) {
    interactables.push(...building.interactables);
  }

  const landmarkCount = rng.nextInt(6, 10);
  const landmarks = pickLandmarksForBiome(biome, seed + 7777, landmarkCount);

  for (const landmark of landmarks) {
    const pos = findPlacement(rng, buildings, objects, interactables);
    if (pos) {
      interactables.push({
        id: landmark.id,
        type: landmark.type,
        pos,
        label: landmark.label,
      });
    }
  }

  return interactables;
}

function findPlacement(
  rng: SeededRandom,
  buildings: Building[],
  objects: MapObject[],
  existing: Interactable[]
): { x: number; y: number } | null {
  for (let attempt = 0; attempt < 30; attempt++) {
    const x = rng.nextInt(3, 44);
    const y = rng.nextInt(3, 32);

    const occupiedByBuilding = buildings.some(b =>
      x >= b.pos.x - 2 && x < b.pos.x + b.size.w + 2 &&
      y >= b.pos.y - 2 && y < b.pos.y + b.size.h + 2
    );
    if (occupiedByBuilding) continue;

    const occupiedByObject = objects.some(o => o.pos.x === x && o.pos.y === y);
    if (occupiedByObject) continue;

    const occupiedByInteractable = existing.some(i => i.pos.x === x && i.pos.y === y);
    if (occupiedByInteractable) continue;

    return { x, y };
  }
  return null;
}

export function getInteractableAt(interactables: Interactable[], x: number, y: number): Interactable | null {
  for (const i of interactables) {
    if (i.pos.x === x && i.pos.y === y) {
      return i;
    }
  }
  return null;
}

export function getNearbyInteractables(
  interactables: Interactable[],
  x: number,
  y: number,
  radius: number = 2
): Interactable[] {
  return interactables.filter(i => {
    const dx = Math.abs(i.pos.x - x);
    const dy = Math.abs(i.pos.y - y);
    return dx <= radius && dy <= radius;
  });
}
