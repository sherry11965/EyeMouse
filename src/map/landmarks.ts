import type { BiomeType, InteractableType } from './types';

export interface LandmarkDef {
  id: string;
  label: string;
  type: InteractableType;
}

export const BIOME_LANDMARKS: Record<BiomeType, LandmarkDef[]> = {
  forest: [
    { id: 'ancient_oak', label: '千年古橡树', type: 'landmark' },
    { id: 'fairy_ring', label: '精灵环蘑菇圈', type: 'landmark' },
    { id: 'hidden_shrine', label: '隐秘神龛', type: 'landmark' },
    { id: 'mushroom_grove', label: '蘑菇林地', type: 'field' },
    { id: 'old_camp', label: '废弃营地', type: 'gather' },
    { id: 'herb_garden', label: '草药园', type: 'field' },
    { id: 'forest_pool', label: '林间水潭', type: 'landmark' },
    { id: 'watchtower', label: '林间瞭望台', type: 'building' },
    { id: 'hunter_hut', label: '猎人小屋', type: 'home' },
    { id: 'forest_board', label: '林间告示板', type: 'board' },
  ],
  plains: [
    { id: 'village_square', label: '村庄广场', type: 'gather' },
    { id: 'windmill_hill', label: '风车丘', type: 'landmark' },
    { id: 'flower_field', label: '花田', type: 'field' },
    { id: 'market_stall', label: '集市摊位', type: 'stall' },
    { id: 'old_well', label: '古井', type: 'landmark' },
    { id: 'bulletin_board', label: '告示板', type: 'board' },
    { id: 'wheat_field', label: '麦田', type: 'field' },
    { id: 'picnic_grove', label: '野餐林地', type: 'gather' },
    { id: 'blacksmith_shop', label: '铁匠铺', type: 'shop' },
    { id: 'village_home', label: '村民住所', type: 'home' },
  ],
  coastal: [
    { id: 'fishing_dock', label: '渔人码头', type: 'dock' },
    { id: 'lighthouse_point', label: '灯塔', type: 'landmark' },
    { id: 'tide_pool', label: '潮汐池', type: 'landmark' },
    { id: 'shipwreck', label: '沉船遗迹', type: 'landmark' },
    { id: 'coral_beach', label: '珊瑚海滩', type: 'landmark' },
    { id: 'fish_market', label: '鱼市', type: 'shop' },
    { id: 'captain_house', label: '老船长屋', type: 'home' },
    { id: 'lookout_rock', label: '望海石', type: 'landmark' },
    { id: 'net_stall', label: '渔网摊位', type: 'stall' },
    { id: 'harbor_board', label: '港口告示板', type: 'board' },
  ],
  mountain: [
    { id: 'mine_entrance', label: '矿洞入口', type: 'building' },
    { id: 'mountain_shrine', label: '山巅神社', type: 'landmark' },
    { id: 'crystal_cave', label: '水晶洞穴', type: 'landmark' },
    { id: 'eagle_nest', label: '鹰巢', type: 'landmark' },
    { id: 'old_bridge', label: '古桥', type: 'landmark' },
    { id: 'stone_circle', label: '石阵', type: 'landmark' },
    { id: 'hot_spring', label: '温泉', type: 'landmark' },
    { id: 'cliff_path', label: '悬崖小径', type: 'landmark' },
    { id: 'miner_hut', label: '矿工小屋', type: 'home' },
    { id: 'mountain_board', label: '山路告示板', type: 'board' },
  ],
  desert: [
    { id: 'oasis', label: '绿洲', type: 'landmark' },
    { id: 'sand_temple', label: '沙之神殿', type: 'building' },
    { id: 'ancient_ruins', label: '远古遗迹', type: 'landmark' },
    { id: 'merchant_camp', label: '商人营地', type: 'gather' },
    { id: 'sandstone_arch', label: '砂岩拱门', type: 'landmark' },
    { id: 'buried_treasure', label: '埋藏宝藏', type: 'quest' },
    { id: 'cactus_garden', label: '仙人掌园', type: 'field' },
    { id: 'mirage_rock', label: '幻影石', type: 'landmark' },
    { id: 'desert_stall', label: '沙漠摊位', type: 'stall' },
    { id: 'desert_board', label: '沙漠告示板', type: 'board' },
  ],
  swamp: [
    { id: 'witch_hut', label: '巫婆小屋', type: 'home' },
    { id: 'bog_pool', label: '沼泽水潭', type: 'landmark' },
    { id: 'ancient_stump', label: '远古树桩', type: 'landmark' },
    { id: 'firefly_grove', label: '萤火虫林', type: 'landmark' },
    { id: 'muddy_crossing', label: '泥泞渡口', type: 'dock' },
    { id: 'mossy_altar', label: '苔藓祭坛', type: 'landmark' },
    { id: 'reed_bed', label: '芦苇丛', type: 'field' },
    { id: 'swamp_tree', label: '沼泽巨树', type: 'landmark' },
    { id: 'swamp_stall', label: '沼泽摊位', type: 'stall' },
    { id: 'swamp_board', label: '沼泽告示板', type: 'board' },
  ],
  tundra: [
    { id: 'ice_cave', label: '冰洞', type: 'landmark' },
    { id: 'frozen_lake', label: '冰封湖', type: 'landmark' },
    { id: 'snow_camp', label: '雪地营地', type: 'gather' },
    { id: 'aurora_point', label: '极光观测点', type: 'landmark' },
    { id: 'frost_monument', label: '霜冻纪念碑', type: 'landmark' },
    { id: 'warm_spring', label: '暖泉', type: 'landmark' },
    { id: 'snowman_field', label: '雪人旷野', type: 'gather' },
    { id: 'wind_shelter', label: '风避所', type: 'home' },
    { id: 'tundra_stall', label: '冻原摊位', type: 'stall' },
    { id: 'tundra_board', label: '冻原告示板', type: 'board' },
  ],
  volcanic: [
    { id: 'lava_fall', label: '熔岩瀑布', type: 'landmark' },
    { id: 'obsidian_forge', label: '黑曜石锻造台', type: 'crafting' },
    { id: 'fire_temple', label: '火焰神殿', type: 'building' },
    { id: 'ash_garden', label: '灰烬花园', type: 'field' },
    { id: 'magma_pool', label: '岩浆池', type: 'landmark' },
    { id: 'ember_crystal', label: '余烬水晶', type: 'landmark' },
    { id: 'ancient_kiln', label: '远古窑炉', type: 'crafting' },
    { id: 'volcano_edge', label: '火山口边缘', type: 'landmark' },
    { id: 'volcanic_stall', label: '火山摊位', type: 'stall' },
    { id: 'volcanic_board', label: '火山告示板', type: 'board' },
  ],
};

const BIOME_DESCRIPTIONS: Record<BiomeType, string[]> = {
  forest: [
    '阳光透过密密的树冠洒落，空气中弥漫着泥土和落叶的气息。古老的树木见证了无数故事。',
    '林间薄雾缭绕，鸟鸣声此起彼伏。这里隐藏着许多不为人知的秘密。',
    '参天古木遮天蔽日，林间小径蜿蜒曲折。偶尔能听到远处传来的溪流声。',
  ],
  plains: [
    '开阔的草原一望无际，微风拂过带来阵阵花香。远处的风车缓缓转动。',
    '金色的麦浪随风起伏，温暖的阳光照耀着这片宁静的土地。',
    '平坦的大地延伸至天际，田野间点缀着零星的树木和花丛。',
  ],
  coastal: [
    '海风带着咸味拂面而来，浪花拍打着礁石。远处的灯塔在薄雾中若隐若现。',
    '金色的沙滩延伸至海湾尽头，渔船在波光中轻轻摇曳。',
    '潮汐日复一日地冲刷着海岸，留下了贝壳和珊瑚的碎片。',
  ],
  mountain: [
    '巍峨的山峰直插云霄，稀薄的空气中透着清冷。山间小径蜿蜒而上。',
    '岩石嶙峋的山坡上点缀着几株顽强的松树。远处传来鹰的啼鸣。',
    '云雾缭绕的山谷中隐藏着古老的矿洞和废弃的哨塔。',
  ],
  desert: [
    '滚烫的沙丘连绵起伏，烈日炙烤着大地。只有耐旱的仙人掌顽强地生存着。',
    '黄沙漫天，偶尔露出的岩石上刻着远古的符文。绿洲是这里最珍贵的存在。',
    '昼夜温差极大，白天的沙漠如同火炉，夜晚却冷得刺骨。',
  ],
  swamp: [
    '潮湿的空气中弥漫着腐殖质的气味，萤火虫在暮色中闪烁。古老的树木扭曲着生长。',
    '泥泞的地面上冒着气泡，不知名的植物在暗处发光。这里既危险又迷人。',
    '浓雾笼罩着沼泽，方向感在这里毫无用处。只有老练的向导才敢深入。',
  ],
  tundra: [
    '冰雪覆盖的大地一望无际，极光在夜空中舞动。寒风刺骨但景色壮美。',
    '永冻层上只有苔藓和地衣能够生存。偶尔能看到北极狐的身影。',
    '漫长的极夜中，星空格外清澈。温暖的篝火是生存的关键。',
  ],
  volcanic: [
    '熔岩在裂缝中流淌，空气中弥漫着硫磺的气味。黑色的火山岩散发着余热。',
    '火山灰覆盖了一切，但在这片死寂中孕育着新生的力量。锻造的锤声回荡在峡谷中。',
    '滚烫的蒸汽从地缝中喷出，远处的火山口冒着浓烟。这里既危险又充满机遇。',
  ],
};

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

export function pickLandmarksForBiome(biome: BiomeType, seed: number, count: number): LandmarkDef[] {
  const all = BIOME_LANDMARKS[biome] || BIOME_LANDMARKS.plains;
  const rng = new SeededRandom(seed);
  const shuffled = [...all];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = rng.nextInt(0, i);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

export function getRegionDescription(biome: BiomeType, seed: number): string {
  const descriptions = BIOME_DESCRIPTIONS[biome] || BIOME_DESCRIPTIONS.plains;
  return descriptions[seed % descriptions.length];
}
