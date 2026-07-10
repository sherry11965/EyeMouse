import type { GeneratedWorld } from '../core/types';
import type { Region, Vec2, WorldMap } from '../map/types';
import { getSpawnPoint } from '../map/regions';

let _world: GeneratedWorld | null = null;
let _worldMap: WorldMap | null = null;

export function setWorldData(w: GeneratedWorld): void {
  _world = w;
  _worldMap = w.worldMap ?? null;
}

export function getWorldData(): GeneratedWorld | null {
  return _world;
}

export function getWorldMap(): WorldMap | null {
  return _worldMap;
}

export function getRegion(id: string): Region | null {
  return _worldMap?.regions.find(r => r.id === id) ?? null;
}

export function getAllRegions(): Region[] {
  return _worldMap?.regions ?? [];
}

export function getWorldBounds(): { w: number; h: number } {
  if (!_worldMap) return { w: 100, h: 100 };
  return _worldMap.bounds;
}

export function getRegionAt(wx: number, wy: number): string | null {
  if (!_worldMap) return null;
  for (const r of _worldMap.regions) {
    const rx = wx - r.pos.x;
    const ry = wy - r.pos.y;
    if (rx >= 0 && rx < r.size.w && ry >= 0 && ry < r.size.h) {
      return r.id;
    }
  }
  return null;
}

export function getRegionAtVec(pos: Vec2): string | null {
  return getRegionAt(pos.x, pos.y);
}

export function getCenterSpawn(): Vec2 {
  if (!_worldMap || _worldMap.regions.length === 0) {
    return { x: 22, y: 17 };
  }
  const center = _worldMap.regions.find(r => r.biome === 'plains') ?? _worldMap.regions[0];
  return getSpawnPoint(center);
}

export function getSpawnForRegion(regionId: string): Vec2 {
  const region = getRegion(regionId);
  if (!region) return { x: 0, y: 0 };
  return getSpawnPoint(region);
}

export function isWalkableAt(wx: number, wy: number): boolean {
  if (!_worldMap) return false;

  for (const region of _worldMap.regions) {
    const rx = wx - region.pos.x;
    const ry = wy - region.pos.y;
    if (rx >= 0 && rx < region.size.w && ry >= 0 && ry < region.size.h) {
      const tile = region.tiles[ry][rx];
      if (!tile.walkable) return false;
      if (tile.buildingId) {
        const building = region.buildings.find(b => b.id === tile.buildingId);
        if (building) {
          const bx = rx - building.pos.x;
          const by = ry - building.pos.y;
          const isDoor = by === building.size.h - 1 && bx === Math.floor(building.size.w / 2);
          if (!isDoor) return false;
        }
      }
      return true;
    }
  }

  return false;
}

export function worldToLocal(regionId: string, worldPos: Vec2): Vec2 | null {
  const region = getRegion(regionId);
  if (!region) return null;
  return {
    x: worldPos.x - region.pos.x,
    y: worldPos.y - region.pos.y
  };
}

export function localToWorld(regionId: string, localPos: Vec2): Vec2 | null {
  const region = getRegion(regionId);
  if (!region) return null;
  return {
    x: localPos.x + region.pos.x,
    y: localPos.y + region.pos.y
  };
}
