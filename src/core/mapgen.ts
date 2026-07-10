import { callLLM } from '../ai/llm';
import type { GeneratedWorld, GeneratedRegion, ResidentPersona, RegionTerrainType } from './types';
import type { WorldMap, BiomeType } from '../map/types';
import { generateWorldMap } from '../map/generator';
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

const BIOME_MAP: Record<RegionTerrainType, BiomeType> = {
  village: 'plains',
  forest: 'forest',
  market: 'plains',
  seaside: 'coastal',
  farm: 'plains',
  plaza: 'plains',
  ruins: 'mountain',
  mountain: 'mountain',
  desert: 'desert'
};

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

function generateLocalWorld(): GeneratedWorld {
  const seed = Date.now() % 999983;
  const themeIdx = seed % WORLD_THEMES.length;
  const theme = WORLD_THEMES[themeIdx];

  const biomes: BiomeType[] = ['forest', 'plains', 'coastal', 'mountain', 'plains', 'plains'];

  const worldMap = generateWorldMap({
    seed,
    width: 200,
    height: 150,
    regionCount: 6,
    biomeDistribution: biomes
  });

  const regions: GeneratedRegion[] = worldMap.regions.map((r, i) => ({
    id: r.id,
    name: r.name,
    terrainType: biomeToTerrainType(r.biome),
    description: '',
    worldOffset: r.pos,
    size: r.size,
    spawn: { x: Math.floor(r.size.w / 2), y: Math.floor(r.size.h / 2) },
    interactables: r.interactables.map(i => ({
      id: i.id,
      type: i.type,
      label: i.label,
      x: i.pos.x,
      y: i.pos.y
    }))
  }));

  const personas: ResidentPersona[] = [
    { id: 'resident_0', name: '艾拉', occupation: '面包师', personality: '热情好客', goals: ['制作美食', '结交朋友'], speechStyle: '温暖活泼', spriteKey: 'baker_pink', home: 'region_2', workplace: 'region_4', backstory: '从远方来到这里开了家面包店' },
    { id: 'resident_1', name: '托比', occupation: '学者', personality: '沉静好奇', goals: ['研究古迹', '记录历史'], speechStyle: '文绉绉', spriteKey: 'mage_blue', home: 'region_2', workplace: 'region_5', backstory: '为寻找失落文明而来' },
    { id: 'resident_2', name: '小梅', occupation: '农夫', personality: '朴实勤劳', goals: ['大丰收', '保护森林'], speechStyle: '简洁直白', spriteKey: 'farmer_green', home: 'region_1', workplace: 'region_1', backstory: '在此地耕耘了三代' },
    { id: 'resident_3', name: '芬恩', occupation: '渔夫', personality: '随性爱吹牛', goals: ['钓大鱼', '讲故事'], speechStyle: '俚语夸张', spriteKey: 'sailor_red', home: 'region_3', workplace: 'region_3', backstory: '据说曾见过海中巨兽' },
    { id: 'resident_4', name: '夜歌', occupation: '旅人', personality: '神秘冷静', goals: ['寻找线索', '揭开秘密'], speechStyle: '隐晦打哑谜', spriteKey: 'mage_purple', home: 'region_0', workplace: 'region_0', backstory: '从未说过自己从哪里来' },
    { id: 'resident_5', name: '镇长', occupation: '镇长', personality: '务实稳重', goals: ['维护秩序', '调查异象'], speechStyle: '沉稳权威', spriteKey: 'knight_yellow', home: 'region_4', workplace: 'region_4', backstory: '正在调查近期的怪事' }
  ];

  return {
    theme,
    worldName: '像素小镇',
    story: '这是一个充满秘密的地方。',
    regions,
    personas,
    events: ['集市开幕', '神秘旅人到来', '今晚有流星雨'],
    seed,
    worldMap
  };
}

async function generateAIWorld(): Promise<GeneratedWorld> {
  const theme = pick(WORLD_THEMES);
  const seed = Date.now() % 999983;

  const prompt = `你是一个像素 RPG 游戏世界生成器。请为主题「${theme}」生成一个小镇世界。

要求：
- 6个区域，每个区域有独特名称、地形类型（从以下选一个：plains/forest/coastal/mountain/desert/swamp/tundra）、简短描述
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
      "terrainType": "plains",
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
      terrainType: BiomeType;
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

  const biomes = data.regions.slice(0, 6).map(r => r.terrainType || 'plains');
  const worldMap = generateWorldMap({
    seed,
    width: 200,
    height: 150,
    regionCount: 6,
    biomeDistribution: biomes
  });

  const regions: GeneratedRegion[] = data.regions.slice(0, 6).map((r, i) => {
    const mapRegion = worldMap.regions[i];
    const cx = Math.max(4, Math.min(mapRegion.size.w - 4, Math.round(mapRegion.size.w * 0.5)));
    const cy = Math.max(4, Math.min(mapRegion.size.h - 4, Math.round(mapRegion.size.h * 0.5)));
    return {
      id: mapRegion.id,
      name: r.name,
      terrainType: biomeToTerrainType(r.terrainType || 'plains'),
      description: r.description,
      worldOffset: mapRegion.pos,
      size: mapRegion.size,
      spawn: { x: cx, y: cy },
      interactables: (r.interactables ?? []).map(obj => ({
        id: obj.id,
        type: obj.type,
        label: obj.label,
        x: Math.max(2, Math.min(mapRegion.size.w - 2, Math.round((obj.relX ?? 0.5) * mapRegion.size.w))),
        y: Math.max(2, Math.min(mapRegion.size.h - 2, Math.round((obj.relY ?? 0.5) * mapRegion.size.h)))
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

  return {
    theme,
    worldName: data.worldName,
    story: data.story,
    regions,
    personas,
    events: data.events ?? [],
    seed,
    worldMap
  };
}

function biomeToTerrainType(biome: BiomeType): RegionTerrainType {
  const map: Record<BiomeType, RegionTerrainType> = {
    forest: 'forest',
    plains: 'plaza',
    desert: 'desert',
    mountain: 'mountain',
    coastal: 'seaside',
    swamp: 'forest',
    tundra: 'mountain',
    volcanic: 'ruins'
  };
  return map[biome] || 'plaza';
}
