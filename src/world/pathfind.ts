import type { Vec2 } from '../core/types';

interface AStarNode {
  x: number;
  y: number;
  g: number;
  f: number;
  parent: string | null;
}

export function aStar(
  start: Vec2,
  goal: Vec2,
  blocked: (x: number, y: number) => boolean,
  bounds: { w: number; h: number }
): Vec2[] | null {
  const key = (x: number, y: number): string => `${x},${y}`;
  const open: Map<string, AStarNode> = new Map();
  const closed: Set<string> = new Set();
  const heuristic = (x: number, y: number): number =>
    Math.abs(x - goal.x) + Math.abs(y - goal.y);

  open.set(key(start.x, start.y), {
    x: start.x,
    y: start.y,
    g: 0,
    f: heuristic(start.x, start.y),
    parent: null
  });

  while (open.size > 0) {
    let bestKey: string | null = null;
    let bestF = Infinity;
    for (const [k, v] of open) {
      if (v.f < bestF) {
        bestF = v.f;
        bestKey = k;
      }
    }
    if (!bestKey) break;
    const cur = open.get(bestKey);
    if (!cur) break;

    if (cur.x === goal.x && cur.y === goal.y) {
      const path: Vec2[] = [];
      let cursor: string | null = bestKey;
      while (cursor) {
        const node = open.get(cursor);
        if (!node) break;
        path.unshift({ x: node.x, y: node.y });
        cursor = node.parent;
      }
      return path;
    }

    open.delete(bestKey);
    closed.add(bestKey);

    const neighbors: Vec2[] = [
      { x: cur.x + 1, y: cur.y },
      { x: cur.x - 1, y: cur.y },
      { x: cur.x, y: cur.y + 1 },
      { x: cur.x, y: cur.y - 1 }
    ];

    for (const n of neighbors) {
      if (n.x < 0 || n.y < 0 || n.x >= bounds.w || n.y >= bounds.h) continue;
      const nKey = key(n.x, n.y);
      if (closed.has(nKey)) continue;
      if (blocked(n.x, n.y) && !(n.x === goal.x && n.y === goal.y)) continue;
      const gNew = cur.g + 1;
      const existing = open.get(nKey);
      if (!existing || gNew < existing.g) {
        open.set(nKey, {
          x: n.x,
          y: n.y,
          g: gNew,
          f: gNew + heuristic(n.x, n.y),
          parent: bestKey
        });
      }
    }
  }
  return null;
}
