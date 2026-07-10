import type { RegionId, Vec2 } from '../core/types';

export interface RegionDef {
  id: RegionId;
  name: string;
  size: { w: number; h: number };
  spawn: Vec2;
  bgColor: string;
  paths: RegionId[];
  interactables: Array<{ id: string; type: string; x: number; y: number; label: string }>;
}

export const REGIONS: Record<RegionId, RegionDef> = {
  plaza: {
    id: 'plaza',
    name: 'Central Plaza',
    size: { w: 28, h: 18 },
    spawn: { x: 14, y: 9 },
    bgColor: '#5a4633',
    paths: ['residential', 'shops', 'farm', 'forest', 'seaside'],
    interactables: [
      { id: 'fountain', type: 'landmark', x: 14, y: 9, label: 'Fountain' },
      { id: 'board', type: 'board', x: 4, y: 4, label: 'Notice Board' },
      { id: 'stall_apple', type: 'stall', x: 8, y: 12, label: 'Apple Stall' },
      { id: 'stall_fish', type: 'stall', x: 20, y: 12, label: 'Fish Stall' },
      { id: 'bench_1', type: 'bench', x: 10, y: 6, label: 'Bench' },
      { id: 'bench_2', type: 'bench', x: 18, y: 6, label: 'Bench' }
    ]
  },
  residential: {
    id: 'residential',
    name: 'Residential',
    size: { w: 22, h: 16 },
    spawn: { x: 11, y: 8 },
    bgColor: '#3d4f3a',
    paths: ['plaza', 'farm'],
    interactables: [
      { id: 'house_a', type: 'home', x: 4, y: 5, label: 'House A' },
      { id: 'house_b', type: 'home', x: 8, y: 5, label: 'House B' },
      { id: 'house_c', type: 'home', x: 14, y: 5, label: 'House C' },
      { id: 'house_d', type: 'home', x: 18, y: 5, label: 'House D' },
      { id: 'mailbox', type: 'object', x: 11, y: 8, label: 'Mailbox' }
    ]
  },
  shops: {
    id: 'shops',
    name: 'Shop Street',
    size: { w: 24, h: 14 },
    spawn: { x: 12, y: 7 },
    bgColor: '#3a3548',
    paths: ['plaza', 'seaside'],
    interactables: [
      { id: 'bakery', type: 'shop', x: 4, y: 6, label: 'Bakery' },
      { id: 'bookshop', type: 'shop', x: 10, y: 6, label: 'Bookshop' },
      { id: 'toolshop', type: 'shop', x: 18, y: 6, label: 'Tool Shop' }
    ]
  },
  farm: {
    id: 'farm',
    name: 'Farmland',
    size: { w: 24, h: 18 },
    spawn: { x: 4, y: 9 },
    bgColor: '#3f5c2f',
    paths: ['plaza', 'residential', 'forest'],
    interactables: [
      { id: 'field_1', type: 'field', x: 10, y: 8, label: 'North Field' },
      { id: 'field_2', type: 'field', x: 14, y: 12, label: 'South Field' },
      { id: 'barn', type: 'building', x: 5, y: 5, label: 'Barn' }
    ]
  },
  forest: {
    id: 'forest',
    name: 'Whispering Forest',
    size: { w: 26, h: 20 },
    spawn: { x: 2, y: 10 },
    bgColor: '#1f3a2f',
    paths: ['plaza', 'farm'],
    interactables: [
      { id: 'grove', type: 'gather', x: 14, y: 10, label: 'Mushroom Grove' },
      { id: 'pond', type: 'gather', x: 8, y: 14, label: 'Hidden Pond' },
      { id: 'shrine', type: 'landmark', x: 20, y: 6, label: 'Old Shrine' }
    ]
  },
  seaside: {
    id: 'seaside',
    name: 'Sunset Pier',
    size: { w: 26, h: 16 },
    spawn: { x: 2, y: 8 },
    bgColor: '#2c4a6b',
    paths: ['plaza', 'shops'],
    interactables: [
      { id: 'dock', type: 'dock', x: 22, y: 8, label: 'Dock' },
      { id: 'lighthouse', type: 'landmark', x: 24, y: 4, label: 'Lighthouse' }
    ]
  }
};

export function getRegion(id: RegionId): RegionDef {
  return REGIONS[id];
}
