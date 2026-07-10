import type { RegionId, Vec2 } from '../core/types';

export interface RegionDef {
  id: RegionId;
  name: string;
  worldOffset: Vec2;          // 区域在世界地图中的左上角坐标
  size: { w: number; h: number };
  spawn: Vec2;                // 区域本地坐标（相对 worldOffset）
  bgColor: string;
  paths: RegionId[];
  interactables: Array<{ id: string; type: string; x: number; y: number; label: string }>;
}

/*
  世界布局 (132 × 70 瓦片):

  ┌──────────────┬──────────────┬─────────────┐  y = 0
  │  森林 (0,0)  │  农场 (46,0) │ 居民区(92,0)│
  │  44×34       │  44×34       │  40×34      │
  ├──────────────┼──────────────┼─────────────┤  y = 34-35 (道路)
  │ 码头 (0,36)  │ 广场 (46,36) │ 商业(92,36) │
  │  44×34       │  44×34       │  40×34      │
  └──────────────┴──────────────┴─────────────┘  y = 70
  x=44-45, x=90-91 为东西向道路
*/

export const WORLD_W = 132;
export const WORLD_H = 70;

export const REGIONS: Record<RegionId, RegionDef> = {
  forest: {
    id: 'forest',
    name: '低语森林',
    worldOffset: { x: 0, y: 0 },
    size: { w: 44, h: 34 },
    spawn: { x: 2, y: 17 },
    bgColor: '#1f3a2f',
    paths: ['farm', 'seaside', 'plaza'],
    interactables: [
      { id: 'grove',      type: 'gather',   x: 22, y: 17, label: '蘑菇林' },
      { id: 'pond',       type: 'gather',   x: 8,  y: 24, label: '隐池' },
      { id: 'shrine',     type: 'landmark', x: 38, y: 6,  label: '古老神社' },
      { id: 'herb_1',     type: 'gather',   x: 14, y: 8,  label: '药草地' },
      { id: 'herb_2',     type: 'gather',   x: 30, y: 22, label: '深处药草' },
      { id: 'log_pile',   type: 'object',   x: 36, y: 28, label: '木材堆' },
      { id: 'ruins',      type: 'landmark', x: 6,  y: 29, label: '古迹废墟' },
      { id: 'berry_bush', type: 'gather',   x: 18, y: 28, label: '浆果丛' },
      { id: 'stone_ring', type: 'landmark', x: 28, y: 12, label: '石环阵' },
      { id: 'old_well',   type: 'object',   x: 40, y: 20, label: '古井' }
    ]
  },

  farm: {
    id: 'farm',
    name: '阳光农场',
    worldOffset: { x: 46, y: 0 },
    size: { w: 44, h: 34 },
    spawn: { x: 4, y: 8 },
    bgColor: '#3f5c2f',
    paths: ['forest', 'residential', 'plaza'],
    interactables: [
      { id: 'field_1',    type: 'field',    x: 10, y: 8,  label: '北田' },
      { id: 'field_2',    type: 'field',    x: 28, y: 8,  label: '东田' },
      { id: 'field_3',    type: 'field',    x: 14, y: 22, label: '南田' },
      { id: 'field_4',    type: 'field',    x: 30, y: 24, label: '西田' },
      { id: 'barn',       type: 'building', x: 5,  y: 5,  label: '谷仓' },
      { id: 'well',       type: 'object',   x: 20, y: 16, label: '水井' },
      { id: 'windmill',   type: 'object',   x: 38, y: 10, label: '风车' },
      { id: 'scarecrow',  type: 'object',   x: 22, y: 14, label: '稻草人' },
      { id: 'greenhouse', type: 'building', x: 36, y: 26, label: '温室' },
      { id: 'chicken_coop', type: 'building', x: 8, y: 28, label: '鸡舍' },
      { id: 'compost',    type: 'object',   x: 40, y: 30, label: '堆肥箱' }
    ]
  },

  residential: {
    id: 'residential',
    name: '居民区',
    worldOffset: { x: 92, y: 0 },
    size: { w: 40, h: 34 },
    spawn: { x: 20, y: 17 },
    bgColor: '#3d4f3a',
    paths: ['farm', 'shops', 'plaza'],
    interactables: [
      { id: 'house_a',    type: 'home',     x: 4,  y: 5,  label: '甲宅' },
      { id: 'house_b',    type: 'home',     x: 12, y: 5,  label: '乙宅' },
      { id: 'house_c',    type: 'home',     x: 22, y: 5,  label: '丙宅' },
      { id: 'house_d',    type: 'home',     x: 32, y: 5,  label: '丁宅' },
      { id: 'house_e',    type: 'home',     x: 6,  y: 22, label: '戊宅' },
      { id: 'house_f',    type: 'home',     x: 16, y: 22, label: '己宅' },
      { id: 'house_g',    type: 'home',     x: 28, y: 22, label: '庚宅' },
      { id: 'park',       type: 'landmark', x: 20, y: 13, label: '社区公园' },
      { id: 'playground', type: 'object',   x: 32, y: 14, label: '游乐场' },
      { id: 'mailbox',    type: 'object',   x: 18, y: 17, label: '信箱' },
      { id: 'community_well', type: 'object', x: 8, y: 28, label: '社区古井' },
      { id: 'notice_board', type: 'board',  x: 35, y: 28, label: '社区公告板' }
    ]
  },

  seaside: {
    id: 'seaside',
    name: '落日码头',
    worldOffset: { x: 0, y: 36 },
    size: { w: 44, h: 34 },
    spawn: { x: 2, y: 17 },
    bgColor: '#2c4a6b',
    paths: ['forest', 'plaza', 'shops'],
    interactables: [
      { id: 'dock',         type: 'dock',     x: 38, y: 17, label: '码头' },
      { id: 'lighthouse',   type: 'landmark', x: 42, y: 4,  label: '灯塔' },
      { id: 'boat_1',       type: 'object',   x: 34, y: 22, label: '渔船' },
      { id: 'boat_2',       type: 'object',   x: 40, y: 28, label: '帆船' },
      { id: 'fishing_spot', type: 'gather',   x: 28, y: 26, label: '垂钓处' },
      { id: 'beach_camp',   type: 'landmark', x: 10, y: 30, label: '海滩营地' },
      { id: 'treasure_x',   type: 'gather',   x: 6,  y: 14, label: '宝藏传说处' },
      { id: 'cliff',        type: 'landmark', x: 4,  y: 8,  label: '观海悬崖' },
      { id: 'fish_market',  type: 'shop',     x: 20, y: 20, label: '鱼市' },
      { id: 'sea_shrine',   type: 'landmark', x: 36, y: 8,  label: '海神祠' },
      { id: 'crab_traps',   type: 'gather',   x: 28, y: 10, label: '蟹笼' }
    ]
  },

  plaza: {
    id: 'plaza',
    name: '中央广场',
    worldOffset: { x: 46, y: 36 },
    size: { w: 44, h: 34 },
    spawn: { x: 22, y: 17 },
    bgColor: '#5a4633',
    paths: ['forest', 'farm', 'residential', 'seaside', 'shops'],
    interactables: [
      { id: 'fountain',     type: 'landmark', x: 22, y: 17, label: '中央喷泉' },
      { id: 'board',        type: 'board',    x: 4,  y: 4,  label: '镇告示板' },
      { id: 'clock_tower',  type: 'landmark', x: 40, y: 4,  label: '钟楼' },
      { id: 'stage',        type: 'landmark', x: 34, y: 10, label: '表演台' },
      { id: 'stall_apple',  type: 'stall',    x: 8,  y: 22, label: '苹果摊' },
      { id: 'stall_fish',   type: 'stall',    x: 14, y: 26, label: '鲜鱼摊' },
      { id: 'stall_craft',  type: 'stall',    x: 28, y: 26, label: '手工艺摊' },
      { id: 'stall_flower', type: 'stall',    x: 22, y: 28, label: '花摊' },
      { id: 'bench_1',      type: 'bench',    x: 10, y: 8,  label: '长椅' },
      { id: 'bench_2',      type: 'bench',    x: 18, y: 8,  label: '长椅' },
      { id: 'bench_3',      type: 'bench',    x: 32, y: 20, label: '长椅' },
      { id: 'statue',       type: 'landmark', x: 14, y: 14, label: '镇长铜像' },
      { id: 'well_plaza',   type: 'object',   x: 30, y: 14, label: '许愿井' }
    ]
  },

  shops: {
    id: 'shops',
    name: '商业街',
    worldOffset: { x: 92, y: 36 },
    size: { w: 40, h: 34 },
    spawn: { x: 20, y: 17 },
    bgColor: '#3a3548',
    paths: ['seaside', 'plaza', 'residential'],
    interactables: [
      { id: 'bakery',      type: 'shop',     x: 6,  y: 6,  label: '面包店' },
      { id: 'bookshop',    type: 'shop',     x: 14, y: 6,  label: '书店' },
      { id: 'toolshop',    type: 'shop',     x: 24, y: 6,  label: '工具店' },
      { id: 'pharmacy',    type: 'shop',     x: 34, y: 6,  label: '药铺' },
      { id: 'tavern',      type: 'shop',     x: 8,  y: 20, label: '酒馆' },
      { id: 'inn',         type: 'building', x: 20, y: 22, label: '旅馆' },
      { id: 'market',      type: 'stall',    x: 30, y: 16, label: '集市' },
      { id: 'blacksmith',  type: 'shop',     x: 36, y: 26, label: '铁匠铺' },
      { id: 'tailor',      type: 'shop',     x: 6,  y: 28, label: '裁缝店' },
      { id: 'street_lamp', type: 'object',   x: 16, y: 14, label: '路灯' },
      { id: 'fountain_s',  type: 'object',   x: 28, y: 28, label: '小喷泉' }
    ]
  }
};

export function getRegion(id: RegionId): RegionDef {
  return REGIONS[id];
}

/** 根据世界坐标判断玩家/NPC 所在区域 */
export function getRegionAt(wx: number, wy: number): RegionId | null {
  for (const [id, r] of Object.entries(REGIONS) as [RegionId, RegionDef][]) {
    const ox = r.worldOffset.x, oy = r.worldOffset.y;
    if (wx >= ox && wx < ox + r.size.w && wy >= oy && wy < oy + r.size.h) {
      return id;
    }
  }
  return null;
}
