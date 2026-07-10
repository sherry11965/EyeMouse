import type { Decision, Direction, ResidentPersona, ResidentState, Vec2 } from '../core/types';
import { aStar } from '../world/pathfind';
import { REGIONS } from '../world/regions';
import { clamp, dist2 } from '../core/util';

export interface AgentMove {
  pos: Vec2;
  dir: Direction;
  walking: boolean;
  done: boolean;
}

export function applyDecision(
  self: ResidentState,
  persona: ResidentPersona,
  decision: Decision,
  agentsInRegion: Array<{ id: string; pos: Vec2 }>
) {
  const region = REGIONS[self.region];
  const blocked = (x: number, y: number) =>
    region.interactables.some(i => Math.abs(i.x - x) + Math.abs(i.y - y) === 0);
  const target = resolveTarget(self, decision, agentsInRegion, region);
  let path: Vec2[] | null = null;
  if (target) {
    path = aStar(self.pos, target, blocked, region.size);
  }
  if (!path || path.length <= 1) {
    if (decision.intent === 'REST') {
      self.energy = clamp(self.energy + 30, 0, 100);
      self.mood = clamp(self.mood + 2, 0, 100);
    } else if (decision.intent === 'WORK') {
      self.energy = clamp(self.energy - 10, 0, 100);
      self.mood = clamp(self.mood - 1, 0, 100);
    } else if (decision.intent === 'IDLE') {
      self.energy = clamp(self.energy + 1, 0, 100);
    }
    self.currentAction = decision.intent;
    return null;
  }
  self.currentAction = decision.intent + (decision.target ? `:${decision.target.id}` : '');
  return path;
}

function resolveTarget(
  _self: ResidentState,
  d: Decision,
  others: Array<{ id: string; pos: Vec2 }>,
  region: { interactables: Array<{ id: string; x: number; y: number; type: string }> }
): Vec2 | null {
  if (d.intent === 'IDLE' || d.intent === 'REST') {
    return null;
  }
  if (d.intent === 'WORK') {
    const workplace = region.interactables.find(i => i.type === 'shop' || i.type === 'field' || i.type === 'dock');
    return workplace ? { x: workplace.x, y: workplace.y } : null;
  }
  if (d.target?.type === 'agent') {
    const other = others.find(o => o.id === d.target!.id);
    if (other) return nearbyTile(other.pos);
  }
  if (d.target?.type === 'object' && d.target.id) {
    const obj = region.interactables.find(i => i.id === d.target!.id);
    if (obj) return { x: obj.x, y: obj.y };
  }
  if (d.target?.type === 'tile' && d.target.id) {
    const [x, y] = d.target.id.split(',').map(Number);
    if (!Number.isNaN(x) && !Number.isNaN(y)) return { x, y };
  }
  return null;
}

function nearbyTile(p: Vec2): Vec2 {
  const tries = [
    { x: p.x + 1, y: p.y }, { x: p.x - 1, y: p.y },
    { x: p.x, y: p.y + 1 }, { x: p.x, y: p.y - 1 }
  ];
  return tries[0];
}

const SPEED = 0.06;

export class AgentController {
  pos: Vec2;
  private path: Vec2[] = [];
  private pathIdx = 0;
  dir: Direction = 'down';
  walking = false;

  constructor(pos: Vec2) { this.pos = { ...pos }; }

  setPath(path: Vec2[]) {
    this.path = path.slice(1);
    this.pathIdx = 0;
    this.walking = this.path.length > 0;
  }

  hasPath(): boolean { return this.pathIdx < this.path.length; }

  step(): AgentMove {
    if (!this.hasPath()) {
      this.walking = false;
      return { pos: this.pos, dir: this.dir, walking: false, done: true };
    }
    const target = this.path[this.pathIdx];
    const dx = target.x - this.pos.x;
    const dy = target.y - this.pos.y;
    if (Math.abs(dx) > SPEED || Math.abs(dy) > SPEED) {
      if (Math.abs(dx) >= Math.abs(dy)) {
        this.dir = dx > 0 ? 'right' : 'left';
        this.pos.x += Math.sign(dx) * SPEED;
      } else {
        this.dir = dy > 0 ? 'down' : 'up';
        this.pos.y += Math.sign(dy) * SPEED;
      }
      return { pos: this.pos, dir: this.dir, walking: true, done: false };
    }
    this.pos = { ...target };
    this.pathIdx++;
    if (this.pathIdx >= this.path.length) this.walking = false;
    return { pos: this.pos, dir: this.dir, walking: this.walking, done: !this.walking };
  }

  near(other: Vec2, radius = 1.2): boolean {
    return dist2(this.pos.x, this.pos.y, other.x, other.y) < radius * radius;
  }
}
