import type { BiomeType, InteractableType } from './types';

export interface LandmarkDef {
  id: string;
  label: string;
  type: InteractableType;
}

export const BIOME_LANDMARKS: Record<BiomeType, LandmarkDef[]> = {
  forest: [
    { id: 'park_entrance', label: '公园入口', type: 'landmark' },
    { id: 'forest_trail', label: '林间步道', type: 'landmark' },
    { id: 'picnic_area', label: '野餐区', type: 'gather' },
    { id: 'bird_watching', label: '观鸟台', type: 'landmark' },
    { id: 'forest_cafe', label: '森林咖啡馆', type: 'shop' },
    { id: 'nature_center', label: '自然教育中心', type: 'building' },
    { id: 'treehouse', label: '树屋', type: 'landmark' },
    { id: 'forest_playground', label: '儿童游乐场', type: 'landmark' },
    { id: 'botanical_garden', label: '植物园', type: 'landmark' },
    { id: 'forest_board', label: '公告栏', type: 'board' },
  ],
  plains: [
    { id: 'town_square', label: '中心广场', type: 'gather' },
    { id: 'town_hall', label: '镇政府大楼', type: 'building' },
    { id: 'police_station', label: '警察局', type: 'building' },
    { id: 'fire_station', label: '消防站', type: 'building' },
    { id: 'post_office', label: '邮局', type: 'building' },
    { id: 'bank', label: '银行', type: 'shop' },
    { id: 'supermarket', label: '超市', type: 'shop' },
    { id: 'bus_station', label: '汽车站', type: 'landmark' },
    { id: 'park_bench', label: '休息长椅', type: 'landmark' },
    { id: 'bulletin_board', label: '公告栏', type: 'board' },
  ],
  coastal: [
    { id: 'fishing_dock', label: '渔人码头', type: 'dock' },
    { id: 'beach', label: '公共海滩', type: 'landmark' },
    { id: 'seafood_market', label: '海鲜市场', type: 'shop' },
    { id: 'lighthouse', label: '灯塔', type: 'landmark' },
    { id: 'coastal_clinic', label: '海边诊所', type: 'building' },
    { id: 'beach_rescue', label: '海上救援站', type: 'building' },
    { id: 'harbor_office', label: '港口管理处', type: 'building' },
    { id: 'seaside_restaurant', label: '海景餐厅', type: 'shop' },
    { id: 'pier', label: '栈桥', type: 'dock' },
    { id: 'coastal_board', label: '公告栏', type: 'board' },
  ],
  mountain: [
    { id: 'hospital', label: '镇医院', type: 'building' },
    { id: 'pharmacy', label: '药店', type: 'shop' },
    { id: 'mountain_school', label: '山脚小学', type: 'building' },
    { id: 'library', label: '图书馆', type: 'building' },
    { id: 'community_center', label: '社区活动中心', type: 'building' },
    { id: 'mountain_trail', label: '登山步道', type: 'landmark' },
    { id: 'viewpoint', label: '观景台', type: 'landmark' },
    { id: 'mountain_cafe', label: '山脚茶馆', type: 'shop' },
    { id: 'senior_home', label: '养老院', type: 'building' },
    { id: 'mountain_board', label: '公告栏', type: 'board' },
  ],
  desert: [
    { id: 'market_square', label: '集市广场', type: 'gather' },
    { id: 'water_station', label: '供水站', type: 'landmark' },
    { id: 'desert_school', label: '沙漠小学', type: 'building' },
    { id: 'trading_post', label: '交易站', type: 'shop' },
    { id: 'desert_clinic', label: '沙漠诊所', type: 'building' },
    { id: 'caravan_stop', label: '商队驿站', type: 'gather' },
    { id: 'oasis_garden', label: '绿洲花园', type: 'landmark' },
    { id: 'desert_museum', label: '沙漠博物馆', type: 'building' },
    { id: 'rest_area', label: '休息区', type: 'landmark' },
    { id: 'desert_board', label: '公告栏', type: 'board' },
  ],
  swamp: [
    { id: 'wetland_center', label: '湿地保护中心', type: 'building' },
    { id: 'swamp_clinic', label: '湿地诊所', type: 'building' },
    { id: 'research_station', label: '生态研究站', type: 'building' },
    { id: 'swamp_school', label: '湿地小学', type: 'building' },
    { id: 'bird_sanctuary', label: '鸟类保护区', type: 'landmark' },
    { id: 'swamp_market', label: '湿地市场', type: 'shop' },
    { id: 'wetland_trail', label: '湿地栈道', type: 'landmark' },
    { id: 'swamp_cafe', label: '湿地茶馆', type: 'shop' },
    { id: 'swamp_gather', label: '村民聚集点', type: 'gather' },
    { id: 'swamp_board', label: '公告栏', type: 'board' },
  ],
  tundra: [
    { id: 'tundra_clinic', label: '冻原诊所', type: 'building' },
    { id: 'tundra_school', label: '冻原小学', type: 'building' },
    { id: 'heating_station', label: '供暖站', type: 'building' },
    { id: 'tundra_market', label: '冻原市场', type: 'shop' },
    { id: 'ice_rink', label: '溜冰场', type: 'landmark' },
    { id: 'tundra_library', label: '冻原图书馆', type: 'building' },
    { id: 'snowmobile_stop', label: '雪橇车站', type: 'landmark' },
    { id: 'tundra_cafe', label: '暖炉咖啡馆', type: 'shop' },
    { id: 'tundra_gather', label: '村民聚集点', type: 'gather' },
    { id: 'tundra_board', label: '公告栏', type: 'board' },
  ],
  volcanic: [
    { id: 'volcanic_clinic', label: '火山诊所', type: 'building' },
    { id: 'geothermal_plant', label: '地热发电站', type: 'building' },
    { id: 'volcanic_school', label: '火山小学', type: 'building' },
    { id: 'hot_spring_bath', label: '温泉浴场', type: 'landmark' },
    { id: 'volcanic_market', label: '火山市场', type: 'shop' },
    { id: 'forge_workshop', label: '锻造工坊', type: 'building' },
    { id: 'volcanic_cafe', label: '火山咖啡馆', type: 'shop' },
    { id: 'geological_center', label: '地质研究中心', type: 'building' },
    { id: 'volcanic_gather', label: '村民聚集点', type: 'gather' },
    { id: 'volcanic_board', label: '公告栏', type: 'board' },
  ],
};

const BIOME_DESCRIPTIONS: Record<BiomeType, string[]> = {
  forest: [
    '这片森林区域经过精心规划，有完善的步道和设施。周末常有家庭来此野餐，孩子们喜欢在树屋间穿梭玩耍。',
    '林间空气清新，鸟鸣声此起彼伏。自然教育中心定期举办活动，是镇上居民休闲的好去处。',
    '参天的树木间点缀着现代化的设施，古老的森林与现代城镇和谐共存。',
  ],
  plains: [
    '开阔的平原上坐落着镇中心，各种公共服务设施一应俱全。这里是小镇的心脏，居民们日常生活的枢纽。',
    '平坦的大地上建有完善的城镇配套，从警察局到超市，应有尽有。生活便利，安居乐业。',
    '镇中心广场是居民们聚集的地方，公告栏上总是贴满了各种通知和活动信息。',
  ],
  coastal: [
    '海风带着咸味拂面而来，码头和海滩是这里最受欢迎的地方。海上救援站日夜守护着渔民的安全。',
    '金色的沙滩延伸至海湾尽头，海鲜市场总是热闹非凡。港口管理处确保着海上交通的有序进行。',
    '潮汐日复一日地冲刷着海岸，栈桥上是散步的居民，灯塔在远处静静伫立。',
  ],
  mountain: [
    '山脚下建有完善的医疗和教育设施，镇医院是周边地区最重要的医疗机构。图书馆藏书丰富，是居民们学习的场所。',
    '巍峨的山峰下是安静的社区，养老院里老人们安详地度过晚年。登山步道吸引着各地的游客。',
    '社区活动中心经常举办各种活动，观景台可以俯瞰整个小镇的美景。',
  ],
  desert: [
    '沙漠中的小镇依靠完善的供水系统和集市维持着生机。商队驿站是信息交流的中心。',
    '绿洲花园是沙漠中的明珠，博物馆展示着这片土地的历史。供水站是小镇的生命线。',
    '昼夜温差极大，但小镇的配套设施让居民们生活舒适。交易站总是人来人往。',
  ],
  swamp: [
    '湿地保护中心和生态研究站让这片沼泽焕发了新的生机。鸟类保护区吸引着众多观鸟爱好者。',
    '湿地栈道蜿蜒曲折，是居民们散步的好去处。研究站的工作人员日夜监测着生态变化。',
    '村民聚集点是大家交流信息的地方，湿地市场出售各种本地特产。',
  ],
  tundra: [
    '冻原上的小镇依靠供暖站度过漫长的冬季。溜冰场是孩子们最爱的地方，咖啡馆里总是温暖的。',
    '极地的严寒被完善的供暖系统抵御，村民们聚集在温暖的室内交流。雪橇车站连接着各个偏远地区。',
    '漫长的极夜中，供暖站的灯光格外温暖。冻原图书馆是居民们消磨时光的好去处。',
  ],
  volcanic: [
    '地热发电站为小镇提供着源源不断的能源，温泉浴场是居民们放松身心的地方。',
    '火山地区虽然危险，但地热资源让这里的生活格外便利。锻造工坊利用地热进行金属加工。',
    '地质研究中心日夜监测着火山活动，确保安全。温泉浴场吸引着各地的游客。',
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
