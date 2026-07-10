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
      const localSpawn = getSpawnPoint(region);
      const offsetX = (index % 3) * 2 - 2;
      const offsetY = Math.floor(index / 3) * 2;
      spawnPos = {
        x: region.pos.x + localSpawn.x + offsetX,
        y: region.pos.y + localSpawn.y + offsetY
      };
      
      if (spawnPos.x < region.pos.x) spawnPos.x = region.pos.x + 1;
      if (spawnPos.x >= region.pos.x + region.size.w) spawnPos.x = region.pos.x + region.size.w - 2;
      if (spawnPos.y < region.pos.y) spawnPos.y = region.pos.y + 1;
      if (spawnPos.y >= region.pos.y + region.size.h) spawnPos.y = region.pos.y + region.size.h - 2;
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
