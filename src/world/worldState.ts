import type { GeneratedWorld, GeneratedRegion, RegionId } from '../core/types';

let _world: GeneratedWorld | null = null;

export function setWorldData(w: GeneratedWorld) { _world = w; }
export function getWorldData(): GeneratedWorld | null { return _world; }

export function getRegion(id: RegionId): GeneratedRegion | null {
  return _world?.regions.find(r => r.id === id) ?? null;
}

export function getAllRegions(): GeneratedRegion[] {
  return _world?.regions ?? [];
}

export function getWorldBounds(): { w: number; h: number } {
  const regions = getAllRegions();
  return {
    w: Math.max(1, ...regions.map(r => r.worldOffset.x + r.size.w)),
    h: Math.max(1, ...regions.map(r => r.worldOffset.y + r.size.h))
  };
}

export function getRegionAt(wx: number, wy: number): RegionId | null {
  for (const r of getAllRegions()) {
    const ox = r.worldOffset.x;
    const oy = r.worldOffset.y;
    if (wx >= ox && wx < ox + r.size.w && wy >= oy && wy < oy + r.size.h) return r.id;
  }
  return null;
}

export function getCenterSpawn(): { x: number; y: number } {
  const regions = getAllRegions();
  const center = regions.find(r => r.terrainType === 'plaza') ?? regions[Math.floor(regions.length / 2)];
  if (!center) return { x: 22, y: 17 };
  return { x: center.worldOffset.x + center.spawn.x, y: center.worldOffset.y + center.spawn.y };
}
