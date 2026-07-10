import { callLLM } from '../ai/llm';
import type { GeneratedWorld, GeneratedRegion, ResidentPersona, RegionTerrainType } from './types';
import { randInt, pick } from './util';

const SPRITE_KEYS = [
  'baker_pink', 'mage_blue', 'farmer_green',
  'sailor_red', 'mage_purple', 'knight_yellow'
];

const WORLD_THEMES = [
  '魔法复苏的中世纪小镇', '末日后重建的蒸汽朋克聚落', '海岛上的神秘遗迹村',
  '架空东方仙侠小镇', '被遗忘的太空殖民前哨站', '时间停滞的维多利亚村庄',
  '地下洞穴中的蘑菇族聚居地', '漂浮岛屿上的云端小镇', '冰雪永封的极地研究站',
  '被神灵庇护的桃花源小村'
];

const REGION_TYPES: RegionTerrainType[] = [
  'village', 'forest', 'market', 'seaside', 'farm', 'plaza', 'ruins', 'mountain', 'desert'
];

// 世界布局：3列×2行，每格 44×34 瓦片，列间隔 2，行间隔 2
const GRID = [
  { col: 0, row: 0 }, { col: 1, row: 0 }, { col: 2, row: 0 },
  { col: 0, row: 1 }, { col: 1, row: 1 }, { col: 2, row: 1 }
];
const CELL_W = 44, CELL_H = 34, GAP = 2;

function gridToOffset(col: number, row: number) {
  return { x: col * (CELL_W + GAP), y: row * (CELL_H + GAP) };
}

/** 用 LLM 生成整个世界，API 可用时调用，否则使用本地预设 */
export async function generateWorld(hasApiKey: boolean): Promise<GeneratedWorld> {
  if (!hasApiKey) {
    return generateLocalWorld();
  }
  try {
    return await generateAIWorld();
  } catch (e) {
    console.warn('AI world gen failed, using local fallback:', e);
    return generateLocalWorld();
  }
}

async function generateAIWorld(): Promise<GeneratedWorld> {
  const theme = pick(WORLD_THEMES);
  const seed = Date.now() % 999983;

  const prompt = `你是一个像素 RPG 游戏世界生成器。请为主题「${theme}」生成一个小镇世界。

要求：
- 6个区域，每个区域有独特名称、地形类型（从以下选一个：${REGION_TYPES.join('/')}）、简短描述
- 每个区域 6-10 个可互动地标/对象，有 id（英文小写+下划线）、label（中文）、type（landmark/shop/home/gather/field/dock/stall/building/object/board）
- 6个居民 NPC，每人有：name（中文名）、occupation（职业）、personality（性格，2句话）、goals（2个目标）、speechStyle（说话风格）、home（住哪个区域，用区域索引0-5）、workplace（工作在哪个区域）、backstory（背景故事，1句）
- 1个世界故事（2-3句，当前主要冲突/谜题）
- 3个正在发生的全局事件（每个一句）

严格返回 JSON，格式：
{
  "worldName": "世界名",
  "story": "故事背景",
  "regions": [
    {
      "name": "区域名",
      "terrainType": "plaza",
      "description": "描述",
      "interactables": [{"id":"obj_id","type":"landmark","label":"中文标签","relX":0.5,"relY":0.5}]
    }
  ],
  "personas": [
    {"name":"姓名","occupation":"职业","personality":"性格","goals":["目标1","目标2"],"speechStyle":"风格","homeRegionIndex":0,"workRegionIndex":1,"backstory":"故事"}
  ],
  "events": ["事件1","事件2","事件3"]
}

注意：interactables 的 relX/relY 是区域内相对位置 0-1。`;

  const raw = await callLLM(
    [
      { role: 'system', content: '你只输出 JSON，不加 markdown 代码块。' },
      { role: 'user', content: prompt }
    ],
    { json: true, temperature: 1.0 }
  );

  const data = JSON.parse(raw) as {
    worldName: string;
    story: string;
    regions: Array<{
      name: string;
      terrainType: RegionTerrainType;
      description: string;
      interactables: Array<{ id: string; type: string; label: string; relX: number; relY: number }>;
    }>;
    personas: Array<{
      name: string;
      occupation: string;
      personality: string;
      goals: string[];
      speechStyle: string;
      homeRegionIndex: number;
      workRegionIndex: number;
      backstory: string;
    }>;
    events: string[];
  };

  const regions: GeneratedRegion[] = data.regions.slice(0, 6).map((r, i) => {
    const { col, row } = GRID[i];
    const offset = gridToOffset(col, row);
    const cx = Math.max(4, Math.min(CELL_W - 4, Math.round(CELL_W * 0.5)));
    const cy = Math.max(4, Math.min(CELL_H - 4, Math.round(CELL_H * 0.5)));
    return {
      id: `region_${i}`,
      name: r.name,
      terrainType: r.terrainType ?? REGION_TYPES[i % REGION_TYPES.length],
      description: r.description,
      worldOffset: offset,
      size: { w: CELL_W, h: CELL_H },
      spawn: { x: cx, y: cy },
      interactables: (r.interactables ?? []).map(obj => ({
        id: obj.id,
        type: obj.type,
        label: obj.label,
        x: Math.max(2, Math.min(CELL_W - 2, Math.round((obj.relX ?? 0.5) * CELL_W))),
        y: Math.max(2, Math.min(CELL_H - 2, Math.round((obj.relY ?? 0.5) * CELL_H)))
      }))
    };
  });

  const personas: ResidentPersona[] = data.personas.slice(0, 6).map((p, i) => ({
    id: `resident_${i}`,
    name: p.name,
    occupation: p.occupation,
    personality: p.personality,
    goals: p.goals ?? [],
    speechStyle: p.speechStyle,
    spriteKey: SPRITE_KEYS[i % SPRITE_KEYS.length],
    home: regions[Math.min(p.homeRegionIndex ?? 0, regions.length - 1)]?.id ?? regions[0].id,
    workplace: regions[Math.min(p.workRegionIndex ?? 0, regions.length - 1)]?.id ?? regions[0].id,
    backstory: p.backstory
  }));

  return { theme, worldName: data.worldName, story: data.story, regions, personas, events: data.events ?? [], seed };
}

/** 本地随机生成，无需 API */
function generateLocalWorld(): GeneratedWorld {
  const seed = Date.now() % 999983;
  const themeIdx = seed % WORLD_THEMES.length;
  const theme = WORLD_THEMES[themeIdx];

  const regionDefs: Array<{ name: string; terrain: RegionTerrainType }> = [
    { name: '低语森林', terrain: 'forest' },
    { name: '阳光农场', terrain: 'farm' },
    { name: '居民区', terrain: 'village' },
    { name: '落日码头', terrain: 'seaside' },
    { name: '中央广场', terrain: 'plaza' },
    { name: '商业街', terrain: 'market' }
  ];

  const regions: GeneratedRegion[] = regionDefs.map((rd, i) => {
    const { col, row } = GRID[i];
    const offset = gridToOffset(col, row);
    return {
      id: `region_${i}`,
      name: rd.name,
      terrainType: rd.terrain,
      description: '',
      worldOffset: offset,
      size: { w: CELL_W, h: CELL_H },
      spawn: { x: Math.floor(CELL_W / 2), y: Math.floor(CELL_H / 2) },
      interactables: defaultInteractables(rd.terrain, i)
    };
  });

  const personas: ResidentPersona[] = [
    { id: 'resident_0', name: '艾拉', occupation: '面包师', personality: '热情好客', goals: ['制作美食', '结交朋友'], speechStyle: '温暖活泼', spriteKey: 'baker_pink', home: 'region_2', workplace: 'region_4', backstory: '从远方来到这里开了家面包店' },
    { id: 'resident_1', name: '托比', occupation: '学者', personality: '沉静好奇', goals: ['研究古迹', '记录历史'], speechStyle: '文绉绉', spriteKey: 'mage_blue', home: 'region_2', workplace: 'region_5', backstory: '为寻找失落文明而来' },
    { id: 'resident_2', name: '小梅', occupation: '农夫', personality: '朴实勤劳', goals: ['大丰收', '保护森林'], speechStyle: '简洁直白', spriteKey: 'farmer_green', home: 'region_1', workplace: 'region_1', backstory: '在此地耕耘了三代' },
    { id: 'resident_3', name: '芬恩', occupation: '渔夫', personality: '随性爱吹牛', goals: ['钓大鱼', '讲故事'], speechStyle: '俚语夸张', spriteKey: 'sailor_red', home: 'region_3', workplace: 'region_3', backstory: '据说曾见过海中巨兽' },
    { id: 'resident_4', name: '夜歌', occupation: '旅人', personality: '神秘冷静', goals: ['寻找线索', '揭开秘密'], speechStyle: '隐晦打哑谜', spriteKey: 'mage_purple', home: 'region_0', workplace: 'region_0', backstory: '从未说过自己从哪里来' },
    { id: 'resident_5', name: '镇长', occupation: '镇长', personality: '务实稳重', goals: ['维护秩序', '调查异象'], speechStyle: '沉稳权威', spriteKey: 'knight_yellow', home: 'region_4', workplace: 'region_4', backstory: '正在调查近期的怪事' }
  ];

  return { theme, worldName: '像素小镇', story: '这是一个充满秘密的地方。', regions, personas, events: ['集市开幕', '神秘旅人到来', '今晚有流星雨'], seed };
}

function defaultInteractables(terrain: RegionTerrainType, idx: number) {
  const rng = (min: number, max: number) => randInt(min, max);
  const base = [
    { id: `obj_${idx}_0`, type: 'landmark', label: '告示牌', x: rng(3, 8), y: rng(3, 8) },
    { id: `obj_${idx}_1`, type: 'object', label: '长椅', x: rng(10, 20), y: rng(10, 16) },
    { id: `obj_${idx}_2`, type: 'landmark', label: '主建筑', x: rng(18, 28), y: rng(8, 16) }
  ];
  if (terrain === 'forest') {
    base.push(
      { id: `obj_${idx}_3`, type: 'gather', label: '蘑菇林', x: rng(8, 18), y: rng(18, 28) },
      { id: `obj_${idx}_4`, type: 'gather', label: '隐池', x: rng(28, 38), y: rng(18, 28) },
      { id: `obj_${idx}_5`, type: 'landmark', label: '古神社', x: rng(35, 42), y: rng(6, 14) }
    );
  } else if (terrain === 'farm') {
    base.push(
      { id: `obj_${idx}_3`, type: 'field', label: '北田', x: rng(8, 18), y: rng(6, 14) },
      { id: `obj_${idx}_4`, type: 'field', label: '南田', x: rng(20, 32), y: rng(18, 28) },
      { id: `obj_${idx}_5`, type: 'building', label: '谷仓', x: rng(6, 12), y: rng(4, 10) }
    );
  } else if (terrain === 'seaside') {
    base.push(
      { id: `obj_${idx}_3`, type: 'dock', label: '码头', x: rng(34, 42), y: rng(14, 20) },
      { id: `obj_${idx}_4`, type: 'gather', label: '垂钓处', x: rng(26, 36), y: rng(22, 30) },
      { id: `obj_${idx}_5`, type: 'landmark', label: '灯塔', x: rng(38, 42), y: rng(4, 10) }
    );
  } else if (terrain === 'market' || terrain === 'plaza') {
    base.push(
      { id: `obj_${idx}_3`, type: 'shop', label: '主铺', x: rng(8, 16), y: rng(6, 14) },
      { id: `obj_${idx}_4`, type: 'stall', label: '摊位', x: rng(22, 32), y: rng(20, 28) },
      { id: `obj_${idx}_5`, type: 'landmark', label: '广场中心', x: rng(18, 26), y: rng(14, 20) }
    );
  }
  return base;
}
