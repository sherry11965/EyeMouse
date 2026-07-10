import type { Interactable, InteractableType, BiomeType, Building, MapObject } from './types';

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

const BIOME_INTERACTABLES: Record<BiomeType, InteractableType[]> = {
  forest: ['quest', 'item', 'portal'],
  plains: ['quest', 'item', 'npc'],
  desert: ['quest', 'item'],
  mountain: ['quest', 'item', 'portal'],
  coastal: ['quest', 'item', 'npc'],
  swamp: ['quest', 'item'],
  tundra: ['quest', 'item'],
  volcanic: ['quest', 'item', 'portal']
};

const INTERACTABLE_LABELS: Record<InteractableType, string[]> = {
  door: ['门', '入口', '大门'],
  bed: ['床', '床铺', '休息处'],
  chest: ['宝箱', '箱子', '储物箱'],
  npc: ['村民', '旅人', '商人'],
  item: ['物品', '掉落物', '资源'],
  crafting: ['工作台', '锻造台', '炼金台'],
  storage: ['仓库', '储物柜', '储藏室'],
  portal: ['传送门', '魔法阵', '次元裂隙'],
  quest: ['任务标记', '感叹号', '任务点'],
  shop: ['商店', '柜台', '交易处']
};

export function generateInteractables(
  biome: BiomeType,
  seed: number,
  buildings: Building[],
  objects: MapObject[]
): Interactable[] {
  const rng = new SeededRandom(seed);
  const interactables: Interactable[] = [];
  const types = BIOME_INTERACTABLES[biome] || ['quest', 'item'];

  for (const building of buildings) {
    interactables.push(...building.interactables);
  }

  const worldInteractableCount = rng.nextInt(3, 6);
  for (let i = 0; i < worldInteractableCount; i++) {
    const type = rng.pick(types);
    const labels = INTERACTABLE_LABELS[type];
    const label = rng.pick(labels);

    let pos = { x: 0, y: 0 };
    let placed = false;

    for (let attempt = 0; attempt < 10 && !placed; attempt++) {
      const x = rng.nextInt(2, 45);
      const y = rng.nextInt(2, 33);

      const occupiedByBuilding = buildings.some(b =>
        x >= b.pos.x - 1 && x < b.pos.x + b.size.w + 1 &&
        y >= b.pos.y - 1 && y < b.pos.y + b.size.h + 1
      );

      const occupiedByObject = objects.some(o => o.pos.x === x && o.pos.y === y);

      if (!occupiedByBuilding && !occupiedByObject) {
        pos = { x, y };
        placed = true;
      }
    }

    if (placed) {
      interactables.push({
        id: `interactable_${biome}_${i}`,
        type,
        pos,
        label
      });
    }
  }

  return interactables;
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
