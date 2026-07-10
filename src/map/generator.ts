import type { 
  WorldMap, MapGenerationConfig, Region, Tile, 
  TerrainType, BiomeType, Vec2, Size 
} from './types';
import { BIOME_TERRAIN } from './types';
import { generateRegion, NoiseGenerator } from './regions';

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
}

export function generateWorldMap(config: MapGenerationConfig): WorldMap {
  const rng = new SeededRandom(config.seed);
  const noise = new NoiseGenerator(config.seed);

  const regions: Region[] = [];
  const regionSize = { w: 48, h: 36 };
  const gap = 4;

  const cols = Math.ceil(Math.sqrt(config.regionCount));
  const rows = Math.ceil(config.regionCount / cols);

  const biomes: BiomeType[] = config.biomeDistribution.length > 0 
    ? config.biomeDistribution 
    : ['forest', 'plains', 'coastal', 'mountain'];

  for (let i = 0; i < config.regionCount; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const pos: Vec2 = {
      x: col * (regionSize.w + gap),
      y: row * (regionSize.h + gap)
    };

    const biome = rng.pick(biomes);
    const region = generateRegion(
      `region_${i}`,
      getRegionName(biome, i),
      biome,
      pos,
      regionSize,
      config.seed + i,
      noise
    );

    regions.push(region);
  }

  for (let i = 0; i < regions.length; i++) {
    const neighbors = findNeighbors(regions, i, cols, rows);
    regions[i].connections = neighbors.map(n => regions[n].id);
  }

  const bounds: Size = {
    w: cols * (regionSize.w + gap),
    h: rows * (regionSize.h + gap)
  };

  return {
    id: `world_${config.seed}`,
    name: '像素小镇',
    seed: config.seed,
    regions,
    bounds
  };
}

function getRegionName(biome: BiomeType, index: number): string {
  const names: Record<BiomeType, string[]> = {
    forest: ['低语森林', '翡翠林地', '迷雾树林', '古木丛林'],
    plains: ['阳光草原', '微风平原', '花海原野', '金麦农场'],
    desert: ['灼热沙漠', '流沙荒原', '赤岩戈壁', '干旱盆地'],
    mountain: ['巍峨山脉', '云雾峰峦', '岩石高地', '雪峰之巅'],
    coastal: ['落日海岸', '碧波海湾', '金沙海滩', '渔人码头'],
    swamp: ['幽暗沼泽', '迷雾湿地', '毒雾泥潭', '古老沼泽'],
    tundra: ['极寒冰原', '永冻之地', '雪原荒丘', '霜冻平原'],
    volcanic: ['熔岩裂谷', '火焰山脉', '灼热地狱', '火山盆地']
  };
  const list = names[biome] || names.plains;
  return list[index % list.length];
}

function findNeighbors(regions: Region[], index: number, cols: number, rows: number): number[] {
  const neighbors: number[] = [];
  const col = index % cols;
  const row = Math.floor(index / cols);

  const directions = [
    [-1, 0], [1, 0], [0, -1], [0, 1]
  ];

  for (const [dc, dr] of directions) {
    const nc = col + dc;
    const nr = row + dr;
    if (nc >= 0 && nc < cols && nr >= 0 && nr < rows) {
      const ni = nr * cols + nc;
      if (ni < regions.length && ni !== index) {
        neighbors.push(ni);
      }
    }
  }

  return neighbors;
}

export function generateTile(
  noise: NoiseGenerator,
  x: number,
  y: number,
  biome: BiomeType
): Tile {
  const elevation = (noise.octaveNoise(x * 0.05, y * 0.05, 4, 0.5) + 1) / 2;
  const moisture = (noise.octaveNoise(x * 0.08 + 100, y * 0.08 + 100, 3, 0.5) + 1) / 2;

  const terrainOptions = BIOME_TERRAIN[biome];
  let terrain: TerrainType;

  if (biome === 'coastal' && elevation < 0.35) {
    terrain = 'water';
  } else if (biome === 'mountain' && elevation > 0.7) {
    terrain = 'snow';
  } else if (biome === 'volcanic' && elevation < 0.3) {
    terrain = 'lava';
  } else {
    const idx = Math.floor(moisture * terrainOptions.length);
    terrain = terrainOptions[Math.min(idx, terrainOptions.length - 1)];
  }

  return {
    terrain,
    elevation,
    moisture,
    walkable: terrain !== 'water' && terrain !== 'lava'
  };
}
