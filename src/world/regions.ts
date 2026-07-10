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
    name: '中央广场',
    size: { w: 28, h: 18 },
    spawn: { x: 14, y: 9 },
    bgColor: '#5a4633',
    paths: ['residential', 'shops', 'farm', 'forest', 'seaside'],
    interactables: [
      { id: 'fountain', type: 'landmark', x: 14, y: 9, label: '喷泉' },
      { id: 'board', type: 'board', x: 4, y: 4, label: '告示板' },
      { id: 'stall_apple', type: 'stall', x: 8, y: 12, label: '苹果摊' },
      { id: 'stall_fish', type: 'stall', x: 20, y: 12, label: '鲜鱼摊' },
      { id: 'bench_1', type: 'bench', x: 10, y: 6, label: '长椅' },
      { id: 'bench_2', type: 'bench', x: 18, y: 6, label: '长椅' }
    ]
  },
  residential: {
    id: 'residential',
    name: '居民区',
    size: { w: 22, h: 16 },
    spawn: { x: 11, y: 8 },
    bgColor: '#3d4f3a',
    paths: ['plaza', 'farm'],
    interactables: [
      { id: 'house_a', type: 'home', x: 4, y: 5, label: '甲宅' },
      { id: 'house_b', type: 'home', x: 8, y: 5, label: '乙宅' },
      { id: 'house_c', type: 'home', x: 14, y: 5, label: '丙宅' },
      { id: 'house_d', type: 'home', x: 18, y: 5, label: '丁宅' },
      { id: 'mailbox', type: 'object', x: 11, y: 8, label: '信箱' }
    ]
  },
  shops: {
    id: 'shops',
    name: '商业街',
    size: { w: 24, h: 14 },
    spawn: { x: 12, y: 7 },
    bgColor: '#3a3548',
    paths: ['plaza', 'seaside'],
    interactables: [
      { id: 'bakery', type: 'shop', x: 4, y: 6, label: '面包店' },
      { id: 'bookshop', type: 'shop', x: 10, y: 6, label: '书店' },
      { id: 'toolshop', type: 'shop', x: 18, y: 6, label: '工具店' }
    ]
  },
  farm: {
    id: 'farm',
    name: '农场',
    size: { w: 24, h: 18 },
    spawn: { x: 4, y: 9 },
    bgColor: '#3f5c2f',
    paths: ['plaza', 'residential', 'forest'],
    interactables: [
      { id: 'field_1', type: 'field', x: 10, y: 8, label: '北田' },
      { id: 'field_2', type: 'field', x: 14, y: 12, label: '南田' },
      { id: 'barn', type: 'building', x: 5, y: 5, label: '谷仓' }
    ]
  },
  forest: {
    id: 'forest',
    name: '低语森林',
    size: { w: 26, h: 20 },
    spawn: { x: 2, y: 10 },
    bgColor: '#1f3a2f',
    paths: ['plaza', 'farm'],
    interactables: [
      { id: 'grove', type: 'gather', x: 14, y: 10, label: '蘑菇林' },
      { id: 'pond', type: 'gather', x: 8, y: 14, label: '隐池' },
      { id: 'shrine', type: 'landmark', x: 20, y: 6, label: '古老神社' }
    ]
  },
  seaside: {
    id: 'seaside',
    name: '落日码头',
    size: { w: 26, h: 16 },
    spawn: { x: 2, y: 8 },
    bgColor: '#2c4a6b',
    paths: ['plaza', 'shops'],
    interactables: [
      { id: 'dock', type: 'dock', x: 22, y: 8, label: '码头' },
      { id: 'lighthouse', type: 'landmark', x: 24, y: 4, label: '灯塔' }
    ]
  }
};

export function getRegion(id: RegionId): RegionDef {
  return REGIONS[id];
}
