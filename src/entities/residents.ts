import type { ResidentPersona, ResidentState, RegionId } from '../core/types';
import { getRegion, getAllRegions } from '../world/worldState';
import { getSpawnPoint } from '../map/regions';

export function createInitialStates(personas: ResidentPersona[]): Map<string, ResidentState> {
  const out = new Map<string, ResidentState>();
  const homeCounts = new Map<RegionId, number>();
  for (const p of personas) {
    const r = getRegion(p.home);
    const regions = getAllRegions();
    const fallback = regions[0];
    const region = r ?? fallback;
    const index = homeCounts.get(region?.id ?? p.home) ?? 0;
    homeCounts.set(region?.id ?? p.home, index + 1);
    
    let spawnPos = { x: 22, y: 17 };
    if (region) {
      const spawn = getSpawnPoint(region);
      spawnPos = {
        x: region.pos.x + clamp(spawn.x + (index % 3) * 2 - 2, 1, region.size.w - 2),
        y: region.pos.y + clamp(spawn.y + Math.floor(index / 3) * 2, 1, region.size.h - 2)
      };
    }
    
    out.set(p.id, {
      id: p.id,
      pos: spawnPos,
      region: region?.id ?? (p.home as RegionId),
      energy: 100,
      mood: 70,
      shortTerm: [],
      longTerm: [],
      relationships: {}
    });
  }
  return out;
}

export function shortTermSnapshot(state: ResidentState, max = 8): string {
  return state.shortTerm.slice(-max).map(m => `[${m.kind}] ${m.text}`).join(' | ');
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}
