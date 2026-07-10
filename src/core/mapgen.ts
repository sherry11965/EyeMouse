import { callLLM } from '../ai/llm';
import type { GeneratedWorld, GeneratedRegion, ResidentPersona, RegionTerrainType } from './types';
import type { WorldMap, BiomeType } from '../map/types';
import { generateWorldMap } from '../map/generator';
import { pick } from './util';

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

const WORLD_STORIES = [
  '古老的魔法阵突然重新运转，镇上的居民们发现周围的世界正在发生变化。有人说这是祝福，也有人担心这是灾难的前兆。镇长正在秘密调查这一切的源头。',
  '末日废墟中新建的聚落逐渐繁荣，但地下的旧时代机器开始自行启动。蒸汽与齿轮的轰鸣声日夜不息，居民们必须决定是利用还是封印这些力量。',
  '海岛上发现了一座远古遗迹，遗迹中的壁画似乎预言了一场即将到来的风暴。岛民们在敬畏与好奇之间徘徊，而遗迹的守护者已经苏醒。',
  '仙侠世界中，一座小镇坐落在灵脉交汇处。近日灵气异动，各路人马纷纷前来探查。镇上的居民发现，自己的命运与这片灵脉紧密相连。',
  '太空殖民前哨站与母星失去了联系，资源日益匮乏。站长必须在探索未知星球和维护殖民地生存之间做出抉择。而站外的异象越来越频繁。',
  '时间在这里停滞了百年，村民们保持着维多利亚时代的生活方式。直到有一天，一个外来者打破了宁静，带来了外面的消息和新的可能。',
  '地下洞穴中的蘑菇族一直与世隔绝，但最近洞穴深处传来了奇怪的震动。族长派出探险队，发现了一条通往地表世界的通道。',
  '漂浮在云端的岛屿群正缓缓下沉，岛民们发现支撑岛屿的古老水晶正在失去能量。必须有人前往危险的云层之下寻找新的水晶。',
  '极地研究站的科学家们发现冰层下隐藏着一座远古城市。随着研究的深入，他们意识到这座城市并非无人居住。',
  '被神灵庇护的桃花源小村一直隐藏在群山之中。但外界的战火越来越近，村民们必须决定是否继续隐藏，还是走出去面对世界。',
];

const WORLD_EVENTS: string[][] = [
  ['集市上出现了来历不明的魔法道具', '森林深处传来了奇异的歌声', '镇长召集居民商讨魔法阵的事宜'],
  ['地下旧机器突然开始运转', '一批新的幸存者请求加入聚落', '工程师发现了修复发电站的方法'],
  ['遗迹入口突然打开了', '海面上出现了不寻常的漩涡', '一位考古学家声称破译了壁画文字'],
  ['灵气波动导致灵药提前成熟', '外来修士闯入小镇引发冲突', '灵脉交汇处出现了神秘光柱'],
  ['通讯设备收到了神秘的求救信号', '探索队在附近发现了可居住的区域', '站外的异象变得越来越频繁'],
  ['外来者带来了关于外界的消息', '镇上的时钟突然开始走动', '一群年轻人想要打破时间的束缚'],
  ['洞穴深处的震动越来越频繁', '探险队在地表发现了新的资源', '蘑菇族的年轻人想要探索外面的世界'],
  ['又一座浮岛坠入了云层', '科学家发现了稳定水晶的新方法', '云层下传来了神秘的信号'],
  ['冰层下的城市发出了光芒', '一位科学家失踪在远古城市中', '极光出现了前所未有的颜色'],
  ['外界的难民请求进入桃花源', '神灵降下了新的预言', '年轻的村民想要走出桃花源'],
];

interface NpcTemplate {
  name: string;
  occupation: string;
  personality: string;
  goals: [string, string];
  speechStyle: string;
  backstory: string;
  preferredBiomes: BiomeType[];
}

const NPC_TEMPLATES: NpcTemplate[] = [
  {
    name: '艾拉',
    occupation: '面包师',
    personality: '总是面带微笑，对每个人都热情相待。喜欢在清晨烤面包，香气能飘满整条街。',
    goals: ['制作出传说中的黄金面包', '让每个旅人都尝到家的味道'],
    speechStyle: '温暖活泼，喜欢用食物打比方',
    backstory: '从远方来到这里，用祖传的手艺开了家面包店。',
    preferredBiomes: ['plains'],
  },
  {
    name: '托比',
    occupation: '学者',
    personality: '沉静而好奇，总是沉浸在古籍之中。对未知事物有着近乎执着的探索欲。',
    goals: ['研究古老的魔法遗迹', '记录这个世界的历史变迁'],
    speechStyle: '文绉绉，喜欢引用古籍',
    backstory: '为寻找失落文明的线索而来到此地。',
    preferredBiomes: ['mountain', 'forest'],
  },
  {
    name: '小梅',
    occupation: '农夫',
    personality: '朴实勤劳，日出而作日落而息。对土地有着深厚的感情，能听懂庄稼的声音。',
    goals: ['迎来前所未有的大丰收', '保护好这片祖辈耕作的土地'],
    speechStyle: '简洁直白，偶尔冒出农谚',
    backstory: '在此地耕耘了三代，每一寸土地都了如指掌。',
    preferredBiomes: ['plains'],
  },
  {
    name: '芬恩',
    occupation: '渔夫',
    personality: '随性洒脱，最爱在傍晚讲述海上的冒险故事。性格豪爽，笑声能传遍整个码头。',
    goals: ['钓到传说中的深海巨鱼', '把冒险故事编成册子留给后人'],
    speechStyle: '俚语夸张，喜欢用海洋比喻',
    backstory: '据说曾见过海中巨兽，但没人能证实。',
    preferredBiomes: ['coastal'],
  },
  {
    name: '夜歌',
    occupation: '旅人',
    personality: '神秘冷静，总是独来独往。眼神中透着超越年龄的智慧，似乎知道许多不为人知的秘密。',
    goals: ['寻找散落在各地的神秘碎片', '揭开这个世界背后的真相'],
    speechStyle: '隐晦打哑谜，话中有话',
    backstory: '从未说过自己从哪里来，也没人知道他要去何方。',
    preferredBiomes: ['forest', 'mountain', 'desert'],
  },
  {
    name: '赵镇长',
    occupation: '镇长',
    personality: '务实稳重，凡事以镇民利益为先。表面上和蔼可亲，实际上心思缜密。',
    goals: ['维护镇上的和平与秩序', '调查近期发生的种种异象'],
    speechStyle: '沉稳权威，措辞谨慎',
    backstory: '在这个镇上生活了大半辈子，正在调查近期的怪事。',
    preferredBiomes: ['plains'],
  },
  {
    name: '林溪',
    occupation: '草药师',
    personality: '温柔细心，能叫出每种草药的名字。喜欢在月光下采集药材，相信植物有灵性。',
    goals: ['调配出能治愈一切的万能药', '建立一座草药博物馆'],
    speechStyle: '轻声细语，常用植物做比喻',
    backstory: '师从深山中的老药师，学成后下山悬壶济世。',
    preferredBiomes: ['forest', 'swamp'],
  },
  {
    name: '铁柱',
    occupation: '矿工',
    personality: '粗犷豪放，力气大得能搬动巨石。外表粗鲁但内心善良，对矿石有着天生的直觉。',
    goals: ['找到传说中的秘银矿脉', '用最好的矿石打造一把绝世武器'],
    speechStyle: '大嗓门，直来直去',
    backstory: '从小在矿洞中长大，对地下的世界比地面更熟悉。',
    preferredBiomes: ['mountain', 'volcanic'],
  },
  {
    name: '阿米尔',
    occupation: '商人',
    personality: '精明圆滑，永远带着商人的微笑。走遍各地，见识广博，消息灵通。',
    goals: ['建立横跨大陆的贸易网络', '收集世间所有珍稀奇物'],
    speechStyle: '热情推销，善于讲故事',
    backstory: '带着满满的货物和故事来到了这个小镇。',
    preferredBiomes: ['desert', 'plains'],
  },
  {
    name: '珊瑚',
    occupation: '贝壳工匠',
    personality: '活泼开朗，手指灵巧得像在跳舞。能把最普通的贝壳变成精美的艺术品。',
    goals: ['创作出能发出海浪声的贝壳项链', '让所有人都爱上手工艺术'],
    speechStyle: '轻快俏皮，爱用颜色形容事物',
    backstory: '从小在海边长大，海浪声是她最好的摇篮曲。',
    preferredBiomes: ['coastal'],
  },
  {
    name: '苍松',
    occupation: '猎人',
    personality: '沉默寡言，目光锐利如鹰。对森林有着深厚的敬畏，从不滥杀猎物。',
    goals: ['守护森林的平衡', '找到传说中的白鹿'],
    speechStyle: '言简意赅，多用自然比喻',
    backstory: '独自在森林中生活了十年，最近才回到镇上。',
    preferredBiomes: ['forest', 'tundra'],
  },
  {
    name: '焰心',
    occupation: '锻造师',
    personality: '热情似火，在炉火前从不疲倦。相信每一块金属都有自己的灵魂。',
    goals: ['锻造出传说中的神器', '培养出下一代锻造大师'],
    speechStyle: '铿锵有力，喜欢用火焰和钢铁做比喻',
    backstory: '继承了家族的锻造技艺，正在寻找最完美的材料。',
    preferredBiomes: ['volcanic', 'mountain'],
  },
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

  const personas = generatePersonas(regions, biomes, seed);

  return {
    theme,
    worldName: '像素小镇',
    story: WORLD_STORIES[themeIdx],
    regions,
    personas,
    events: WORLD_EVENTS[themeIdx],
    seed,
    worldMap
  };
}

function generatePersonas(
  regions: GeneratedRegion[],
  biomes: BiomeType[],
  seed: number
): ResidentPersona[] {
  const rng = new SeededRandom(seed + 9999);
  const personas: ResidentPersona[] = [];
  const usedTemplates = new Set<number>();

  for (let i = 0; i < 6; i++) {
    let templateIdx = -1;

    for (let attempt = 0; attempt < 30; attempt++) {
      const idx = rng.nextInt(0, NPC_TEMPLATES.length - 1);
      if (usedTemplates.has(idx)) continue;
      const template = NPC_TEMPLATES[idx];
      const hasMatch = template.preferredBiomes.some(b => biomes.includes(b));
      if (hasMatch || attempt >= 29) {
        templateIdx = idx;
        break;
      }
    }
    if (templateIdx === -1) {
      for (let j = 0; j < NPC_TEMPLATES.length; j++) {
        if (!usedTemplates.has(j)) { templateIdx = j; break; }
      }
    }
    if (templateIdx === -1) templateIdx = i % NPC_TEMPLATES.length;
    usedTemplates.add(templateIdx);

    const template = NPC_TEMPLATES[templateIdx];

    let homeIdx = 0;
    for (let j = 0; j < biomes.length; j++) {
      if (template.preferredBiomes.includes(biomes[j])) {
        homeIdx = j;
        break;
      }
    }

    let workIdx = (homeIdx + 1 + rng.nextInt(0, regions.length - 2)) % regions.length;
    if (workIdx === homeIdx) workIdx = (homeIdx + 1) % regions.length;

    personas.push({
      id: `resident_${i}`,
      name: template.name,
      occupation: template.occupation,
      personality: template.personality,
      goals: [...template.goals],
      speechStyle: template.speechStyle,
      spriteKey: SPRITE_KEYS[i % SPRITE_KEYS.length],
      home: regions[homeIdx].id,
      workplace: regions[workIdx].id,
      backstory: template.backstory,
    });
  }

  return personas;
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
