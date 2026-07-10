export type Vec2 = { x: number; y: number };
export type Size = { w: number; h: number };

export type TerrainType = 
  | 'grass' | 'dirt' | 'stone' | 'sand' | 'water' 
  | 'dark_grass' | 'snow' | 'lava' | 'ice';

export type BiomeType = 
  | 'forest' | 'plains' | 'desert' | 'mountain' 
  | 'coastal' | 'swamp' | 'tundra' | 'volcanic';

export type BuildingType = 
  | 'house' | 'shop' | 'tavern' | 'church' | 'castle'
  | 'barn' | 'windmill' | 'lighthouse' | 'tower' | 'ruins';

export type ObjectType =
  | 'tree' | 'rock' | 'flower' | 'bush' | 'fence'
  | 'sign' | 'bench' | 'lamp' | 'chest' | 'well'
  | 'fountain' | 'statue' | 'bridge' | 'dock' | 'boat';

export type InteractableType =
  | 'door' | 'bed' | 'chest' | 'npc' | 'item'
  | 'crafting' | 'storage' | 'portal' | 'quest' | 'shop';

export interface Tile {
  terrain: TerrainType;
  elevation: number;
  moisture: number;
  walkable: boolean;
  buildingId?: string;
  objectId?: string;
}

export interface Building {
  id: string;
  type: BuildingType;
  name: string;
  pos: Vec2;
  size: Size;
  tiles: Vec2[];
  ownerId?: string;
  interactables: Interactable[];
}

export interface MapObject {
  id: string;
  type: ObjectType;
  pos: Vec2;
  variant: number;
  interactable?: boolean;
}

export interface Interactable {
  id: string;
  type: InteractableType;
  pos: Vec2;
  label: string;
  targetId?: string;
  data?: Record<string, unknown>;
}

export interface Region {
  id: string;
  name: string;
  biome: BiomeType;
  pos: Vec2;
  size: Size;
  tiles: Tile[][];
  buildings: Building[];
  objects: MapObject[];
  interactables: Interactable[];
  connections: string[];
}

export interface WorldMap {
  id: string;
  name: string;
  seed: number;
  regions: Region[];
  bounds: Size;
}

export interface MapGenerationConfig {
  seed: number;
  width: number;
  height: number;
  regionCount: number;
  biomeDistribution: BiomeType[];
}

export const TERRAIN_COLORS: Record<TerrainType, string> = {
  grass: '#7ec87e',
  dirt: '#d4a574',
  stone: '#a0a8b0',
  sand: '#f5deb3',
  water: '#5dade2',
  dark_grass: '#5a9c4f',
  snow: '#f0f8ff',
  lava: '#ff4500',
  ice: '#b0e0e6'
};

export const BIOME_TERRAIN: Record<BiomeType, TerrainType[]> = {
  forest: ['grass', 'dark_grass', 'dirt'],
  plains: ['grass', 'dirt'],
  desert: ['sand', 'dirt'],
  mountain: ['stone', 'dirt', 'snow'],
  coastal: ['sand', 'water', 'grass'],
  swamp: ['dark_grass', 'water', 'dirt'],
  tundra: ['snow', 'ice', 'stone'],
  volcanic: ['lava', 'stone', 'dirt']
};
