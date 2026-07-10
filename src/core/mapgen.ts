import { callLLM } from '../ai/llm';
import type { GeneratedWorld, GeneratedRegion, ResidentPersona, RegionTerrainType } from './types';
import type { WorldMap, BiomeType } from '../map/types';
import { generateWorldMap } from '../map/generator';
import { pick } from './util';

const SPRITE_KEYS = [
  'baker_pink', 'mage_blue', 'farmer_green',
  'sailor_red', 'mage_purple', 'knight_yellow'
];

const FIXED_NPCS: ResidentPersona[] = [
  {
    id: 'npc_zhao',
    name: '赵建国',
    occupation: '镇长',
    personality: '做事认真负责，凡事以镇民利益为先。平时看起来很严肃，其实很关心每个人的生活。',
    goals: ['让小镇发展得更好', '解决镇上的各种问题'],
    speechStyle: '沉稳权威，说话有条有理',
    spriteKey: 'knight_yellow',
    home: 'region_1',
    workplace: 'region_1',
    backstory: '在这个镇上生活了大半辈子，大家都叫他老赵。',
  },
  {
    id: 'npc_li',
    name: '李秀兰',
    occupation: '医生',
    personality: '温柔细心，对每个病人都很有耐心。工作认真负责，经常加班到很晚。',
    goals: ['让每个镇民都健健康康', '引进更好的医疗设备'],
    speechStyle: '温和关切，像妈妈一样唠叨',
    spriteKey: 'baker_pink',
    home: 'region_3',
    workplace: 'region_3',
    backstory: '医学院毕业后放弃了大城市的offer，选择回到家乡当医生。',
  },
  {
    id: 'npc_wang',
    name: '王大明',
    occupation: '警察',
    personality: '正义感强，巡逻时一丝不苟。虽然看起来很凶，但对镇上的孩子们特别温柔。',
    goals: ['维护小镇治安', '让每个人都安居乐业'],
    speechStyle: '直来直去，声音洪亮',
    spriteKey: 'sailor_red',
    home: 'region_1',
    workplace: 'region_1',
    backstory: '退伍后当了警察，把维护治安当成自己的使命。',
  },
  {
    id: 'npc_chen',
    name: '陈小芳',
    occupation: '老师',
    personality: '活泼开朗，深受学生喜爱。总是想办法让课堂变得有趣，相信教育能改变命运。',
    goals: ['让每个孩子都能好好学习', '办一次全镇的文艺汇演'],
    speechStyle: '热情洋溢，喜欢鼓励人',
    spriteKey: 'farmer_green',
    home: 'region_3',
    workplace: 'region_3',
    backstory: '师范大学毕业后回到家乡教书，已经教了十年了。',
  },
  {
    id: 'npc_zhang',
    name: '张富贵',
    occupation: '超市老板',
    personality: '精明能干，做生意很有一套。为人热情，喜欢和顾客聊天，是镇上的消息灵通人士。',
    goals: ['把超市生意做大', '让镇民买到更多好东西'],
    speechStyle: '热情推销，爱讲生意经',
    spriteKey: 'mage_blue',
    home: 'region_1',
    workplace: 'region_1',
    backstory: '从摆地摊开始，一步步把超市开起来，是镇上的致富能手。',
  },
  {
    id: 'npc_liu',
    name: '刘大海',
    occupation: '邮递员',
    personality: '乐观开朗，每天骑车送邮件，风雨无阻。认识镇上的每个人，人缘极好。',
    goals: ['把每封信都准时送到', '组织一次全镇的骑行活动'],
    speechStyle: '爽朗大笑，爱开玩笑',
    spriteKey: 'mage_purple',
    home: 'region_1',
    workplace: 'region_1',
    backstory: '当了二十年的邮递员，镇上的大街小巷他都了如指掌。',
  },
];

const WORLD_STORIES = [
  '小镇最近收到了一笔发展基金，镇政府打算用来改善基础设施。但是这笔钱的用途引发了居民们的讨论，有人想修路，有人想建学校，还有人想开个大商场。镇长正在广泛听取大家的意见。',
  '镇上最近来了不少新居民，老住户们既高兴又有些担忧。高兴的是小镇越来越热闹，担忧的是原来的生活方式可能会改变。社区正在组织活动，促进新老居民的融合。',
  '小镇的图书馆要翻新了，里面发现了一批几十年前的老照片和文件。这些资料记录着小镇的过去，也揭示了一些不为人知的故事。镇上的老人们开始回忆起往事。',
  '镇上要举办一年一度的文化节，大家都忙着准备。学校的学生在排练节目，超市在进货，警察局在制定安保方案。整个小镇都沉浸在节日的气氛中。',
  '最近镇上开了一家新的咖啡馆，成了居民们聚会的新去处。老板是个年轻人，带来了很多新想法。老一辈虽然有些不习惯，但也渐渐接受了这些变化。',
  '小镇的供水系统需要升级，工程队进驻了镇子。施工期间给居民生活带来了一些不便，但大家都理解这是为了长远发展。镇政府每天都在跟进工程进度。',
  '镇上的小学要扩建了，需要征用旁边的一块空地。但是那块地上有一片老树林，有些居民舍不得。学校和教育部门正在和大家商量一个两全的方案。',
  '小镇最近通了网络，居民们终于可以和远方的亲友视频通话了。年轻人兴奋地探索着新世界，老人们则有些不知所措。社区正在组织培训，教大家使用智能手机。',
  '镇上的养老院要扩建了，需要招聘更多的护理人员。很多年轻人对这个工作感兴趣，但是缺乏经验。养老院正在和医院合作，开展专业培训。',
  '小镇的消防站要添置新设备了，消防员们正在进行训练。居民们纷纷前来观看，孩子们特别兴奋。消防站还开放了参观日，教大家消防安全知识。',
];

const WORLD_EVENTS: string[][] = [
  ['镇政府召开发展基金使用听证会', '超市周末大促销，张老板忙得不可开交', '警察局招募志愿者协助巡逻'],
  ['社区举办新老居民联谊会', '学校家长会讨论扩建事宜', '超市新进了一批进口商品'],
  ['图书馆老照片展览即将开幕', '老人们聚在一起回忆往事', '学校组织学生采访老人记录历史'],
  ['文化节筹备工作全面展开', '学校节目排练进入冲刺阶段', '警察局加强节日安保部署'],
  ['新咖啡馆推出特色饮品', '年轻人聚会有了新去处', '老一辈开始尝试接受新事物'],
  ['供水系统升级工程启动', '施工期间部分区域临时停水', '工程队加班加点赶进度'],
  ['小学扩建方案征求意见', '老树林去留引发讨论', '教育部门介入协调'],
  ['小镇网络正式开通', '社区举办智能手机培训班', '老人们学习视频通话'],
  ['养老院扩建工程启动', '护理人员招聘进行中', '医院开展专业培训'],
  ['消防站添置新设备', '消防训练公开演示', '消防安全知识普及活动'],
];

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
  const themeIdx = seed % WORLD_STORIES.length;

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
    description: r.description,
    worldOffset: r.pos,
    size: r.size,
    spawn: { x: Math.floor(r.size.w / 2), y: Math.floor(r.size.h / 2) },
    interactables: r.interactables.map(inter => ({
      id: inter.id,
      type: inter.type,
      label: inter.label,
      x: inter.pos.x,
      y: inter.pos.y
    }))
  }));

  const personas = FIXED_NPCS.map((npc, i) => ({
    ...npc,
    id: `npc_${i}`,
    home: regions[parseInt(npc.home.split('_')[1]) % regions.length].id,
    workplace: regions[parseInt(npc.workplace.split('_')[1]) % regions.length].id,
  }));

  return {
    theme: '小镇生活',
    worldName: '像素小镇',
    story: WORLD_STORIES[themeIdx],
    regions,
    personas,
    events: WORLD_EVENTS[themeIdx],
    seed,
    worldMap
  };
}

async function generateAIWorld(): Promise<GeneratedWorld> {
  const theme = pick(WORLD_STORIES);
  const seed = Date.now() % 999983;

  const prompt = `你是一个像素 RPG 游戏世界生成器。请生成一个普通小城镇的世界。

这是一个正常的小镇，有警察局、医院、学校、超市、邮局等配套设施，不是野外求生。

要求：
- 6个区域，每个区域有独特名称、地形类型（从以下选一个：plains/forest/coastal/mountain）、简短描述
- 每个区域 6-10 个城镇设施/地标，有 id（英文小写+下划线）、label（中文）、type（landmark/shop/home/gather/field/dock/stall/building/board）
  设施类型参考：警察局、医院、学校、超市、银行、邮局、消防站、图书馆、公园、广场、餐厅、咖啡馆、理发店、诊所、药店等
- 6个居民 NPC，每人有：name（中文名）、occupation（职业，如警察/医生/老师/店主/邮递员/镇长等）、personality（性格，2句话）、goals（2个目标）、speechStyle（说话风格）、home（住哪个区域，用区域索引0-5）、workplace（工作在哪个区域）、backstory（背景故事，1句）
- 1个世界故事（2-3句，小镇当前发生的事情）
- 3个正在发生的全局事件（每个一句）

严格返回 JSON，格式：
{
  "worldName": "小镇名",
  "story": "故事背景",
  "regions": [
    {
      "name": "区域名",
      "terrainType": "plains",
      "description": "描述",
      "interactables": [{"id":"obj_id","type":"building","label":"中文标签","relX":0.5,"relY":0.5}]
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
    theme: '小镇生活',
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
