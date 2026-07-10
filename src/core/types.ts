export type Vec2 = { x: number; y: number };
export type Direction = 'up' | 'down' | 'left' | 'right';
export type RegionId = string;

export type Intent = 'GO_TO' | 'TALK' | 'WORK' | 'REST' | 'INTERACT_OBJECT' | 'IDLE';

export interface Decision {
  intent: Intent;
  target?: { type: 'agent' | 'tile' | 'object'; id: string };
  speech?: string;
  thought?: string;
  memory_to_store?: string;
}

export interface ResidentPersona {
  id: string;
  name: string;
  occupation: string;
  personality: string;
  goals: string[];
  speechStyle: string;
  spriteKey: string;
  home: RegionId;
  workplace: RegionId;
  backstory?: string;
}

export interface MemoryEntry {
  ts: number;
  kind: 'event' | 'dialogue' | 'observation' | 'reflection';
  importance: number;
  text: string;
  refId?: string;
}

export interface Relationship {
  affinity: number;
  trust: number;
  lastInteractionTs: number;
}

export interface ResidentState {
  id: string;
  pos: Vec2;
  region: RegionId;
  energy: number;
  mood: number;
  shortTerm: MemoryEntry[];
  longTerm: MemoryEntry[];
  relationships: Record<string, Relationship>;
  currentAction?: string;
}

export interface LLMConfig {
  endpoint: string;
  apiKey: string;
  model: string;
  maxConcurrency: number;
  dailyTokenBudget: number;
}

export interface WorldTime {
  minutes: number;
  day: number;
  season: 'spring' | 'summer' | 'autumn' | 'winter';
  weather: 'sunny' | 'cloudy' | 'rain' | 'storm' | 'snow' | 'fog';
}

export type RegionTerrainType =
  | 'village' | 'forest' | 'market' | 'seaside'
  | 'farm' | 'plaza' | 'ruins' | 'mountain' | 'desert';

export interface GeneratedInteractable {
  id: string;
  type: string;
  x: number;
  y: number;
  label: string;
}

export interface GeneratedRegion {
  id: string;
  name: string;
  terrainType: RegionTerrainType;
  description: string;
  worldOffset: Vec2;
  size: { w: number; h: number };
  spawn: Vec2;
  interactables: GeneratedInteractable[];
}

export interface GeneratedWorld {
  theme: string;
  worldName: string;
  story: string;
  regions: GeneratedRegion[];
  personas: ResidentPersona[];
  events: string[];
  seed: number;
  worldMap?: import('../map/types').WorldMap;
}

export interface GeneratedWorld {
  theme: string;
  worldName: string;
  story: string;
  regions: GeneratedRegion[];
  personas: ResidentPersona[];
  events: string[];
  seed: number;
  worldMap?: import('../map/types').WorldMap;
}
