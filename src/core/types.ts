export type Vec2 = { x: number; y: number };

export type Direction = 'up' | 'down' | 'left' | 'right';

export type RegionId = 'plaza' | 'residential' | 'shops' | 'farm' | 'forest' | 'seaside';

export type Intent =
  | 'GO_TO'
  | 'TALK'
  | 'WORK'
  | 'REST'
  | 'INTERACT_OBJECT'
  | 'IDLE';

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
