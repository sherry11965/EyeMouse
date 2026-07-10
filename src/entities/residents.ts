import type { ResidentPersona, ResidentState, RegionId } from '../core/types';
import { REGIONS } from '../world/regions';

export function createInitialStates(): Map<string, ResidentState> {
  const out = new Map<string, ResidentState>();
  for (const p of personas()) {
    out.set(p.id, {
      id: p.id,
      pos: spawnFor(p),
      region: p.home,
      energy: 100,
      mood: 70,
      shortTerm: [],
      longTerm: [],
      relationships: {}
    });
  }
  return out;
}

function personas(): ResidentPersona[] {
  // cyclic import guard
  return (globalThis as { __PERSONAS?: ResidentPersona[] }).__PERSONAS ?? [];
}

export function setPersonas(p: ResidentPersona[]) {
  (globalThis as { __PERSONAS?: ResidentPersona[] }).__PERSONAS = p;
}

export function spawnFor(p: ResidentPersona): { x: number; y: number } {
  const r = REGIONS[p.home];
  return { ...r.spawn };
}

export function regionSpawn(region: RegionId) {
  const r = REGIONS[region];
  return { ...r.spawn };
}

export function shortTermSnapshot(state: ResidentState, max = 8): string {
  return state.shortTerm.slice(-max).map(m => `[${m.kind}] ${m.text}`).join(' | ');
}
