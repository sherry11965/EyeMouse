import type { Building, BuildingType, BiomeType, Vec2, Size, Interactable } from './types';

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

const BUILDING_SIZES: Record<BuildingType, { w: number; h: number }> = {
  house: { w: 5, h: 4 },
  shop: { w: 6, h: 5 },
  tavern: { w: 7, h: 6 },
  church: { w: 6, h: 8 },
  castle: { w: 10, h: 10 },
  barn: { w: 8, h: 6 },
  windmill: { w: 4, h: 4 },
  lighthouse: { w: 4, h: 6 },
  tower: { w: 4, h: 7 },
  ruins: { w: 6, h: 5 }
};

const BIOME_BUILDINGS: Record<BiomeType, BuildingType[]> = {
  forest: ['house', 'ruins'],
  plains: ['house', 'shop', 'tavern', 'barn', 'windmill'],
  desert: ['house', 'ruins', 'tower'],
  mountain: ['house', 'tower', 'ruins'],
  coastal: ['house', 'shop', 'tavern', 'lighthouse'],
  swamp: ['house', 'ruins'],
  tundra: ['house', 'tower'],
  volcanic: ['tower', 'ruins']
};

const BUILDING_NAMES: Record<BuildingType, string[]> = {
  house: ['温馨小屋', '石砌住宅', '木屋', '农舍'],
  shop: ['杂货铺', '面包店', '铁匠铺', '裁缝店'],
  tavern: ['醉鹿酒馆', '金杯酒吧', '旅人驿站', '老船长酒馆'],
  church: ['光明教堂', '古老神殿', '祈祷堂', '圣光礼拜堂'],
  castle: ['领主城堡', '古老要塞', '王宫', '石堡'],
  barn: ['大谷仓', '牲畜棚', '农具库', '草料仓'],
  windmill: ['风车磨坊', '老风车', '磨面坊'],
  lighthouse: ['灯塔', '守望塔', '引航灯塔'],
  tower: ['法师塔', '瞭望塔', '钟楼', '哨塔'],
  ruins: ['古老遗迹', '废墟', '断壁残垣', '远古神庙']
};

export function generateBuildings(
  biome: BiomeType,
  seed: number,
  size: Size
): Building[] {
  const rng = new SeededRandom(seed);
  const buildings: Building[] = [];
  const buildingTypes = BIOME_BUILDINGS[biome] || ['house'];

  const count = Math.min(8, Math.max(3, Math.floor((size.w * size.h) / 200)));

  const occupied = new Set<string>();

  for (let i = 0; i < count; i++) {
    const type = rng.pick(buildingTypes);
    const buildingSize = BUILDING_SIZES[type];

    let placed = false;
    for (let attempt = 0; attempt < 20 && !placed; attempt++) {
      const x = rng.nextInt(2, size.w - buildingSize.w - 2);
      const y = rng.nextInt(2, size.h - buildingSize.h - 2);

      if (canPlaceBuilding(x, y, buildingSize.w, buildingSize.h, occupied, size)) {
        const tiles: Vec2[] = [];
        for (let dy = 0; dy < buildingSize.h; dy++) {
          for (let dx = 0; dx < buildingSize.w; dx++) {
            const tx = x + dx;
            const ty = y + dy;
            tiles.push({ x: tx, y: ty });
            occupied.add(`${tx},${ty}`);
          }
        }

        const names = BUILDING_NAMES[type];
        const name = rng.pick(names);

        const interactables = generateBuildingInteractables(type, { x, y }, buildingSize, rng);

        buildings.push({
          id: `building_${i}`,
          type,
          name,
          pos: { x, y },
          size: { w: buildingSize.w, h: buildingSize.h },
          tiles,
          interactables
        });

        placed = true;
      }
    }
  }

  return buildings;
}

function canPlaceBuilding(
  x: number,
  y: number,
  w: number,
  h: number,
  occupied: Set<string>,
  size: Size
): boolean {
  const buffer = 2;

  for (let dy = -buffer; dy < h + buffer; dy++) {
    for (let dx = -buffer; dx < w + buffer; dx++) {
      const tx = x + dx;
      const ty = y + dy;
      if (tx < 0 || tx >= size.w || ty < 0 || ty >= size.h) {
        continue;
      }
      if (occupied.has(`${tx},${ty}`)) {
        return false;
      }
    }
  }

  return true;
}

function generateBuildingInteractables(
  type: BuildingType,
  pos: Vec2,
  size: { w: number; h: number },
  rng: SeededRandom
): Interactable[] {
  const interactables: Interactable[] = [];

  const doorX = pos.x + Math.floor(size.w / 2);
  const doorY = pos.y + size.h - 1;
  interactables.push({
    id: `door_${pos.x}_${pos.y}`,
    type: 'door',
    pos: { x: doorX, y: doorY },
    label: '门'
  });

  if (type === 'house' || type === 'tavern') {
    const bedX = pos.x + rng.nextInt(1, size.w - 2);
    const bedY = pos.y + rng.nextInt(1, Math.min(2, size.h - 2));
    interactables.push({
      id: `bed_${pos.x}_${pos.y}`,
      type: 'bed',
      pos: { x: bedX, y: bedY },
      label: '床'
    });
  }

  if (type === 'shop' || type === 'tavern') {
    const chestX = pos.x + rng.nextInt(1, size.w - 2);
    const chestY = pos.y + rng.nextInt(1, size.h - 2);
    interactables.push({
      id: `chest_${pos.x}_${pos.y}`,
      type: 'chest',
      pos: { x: chestX, y: chestY },
      label: '储物箱'
    });
  }

  if (type === 'shop') {
    interactables.push({
      id: `shop_${pos.x}_${pos.y}`,
      type: 'shop',
      pos: { x: pos.x + Math.floor(size.w / 2), y: pos.y + Math.floor(size.h / 2) },
      label: '商店柜台'
    });
  }

  return interactables;
}

export function getBuildingAt(buildings: Building[], x: number, y: number): Building | null {
  for (const b of buildings) {
    if (x >= b.pos.x && x < b.pos.x + b.size.w &&
        y >= b.pos.y && y < b.pos.y + b.size.h) {
      return b;
    }
  }
  return null;
}
