import { neighbors, stepCost, tracePath } from './grid';
import { heuristic } from './heuristics';
import { PriorityQueue } from './priorityQueue';
import type { Algorithm, CellId, StepEvent } from './types';

interface Entry {
  node: CellId;
  f: number;
  h: number;
  seq: number;
}

export const astar: Algorithm = (grid, start, end, options) => {
  const size = grid.rows * grid.cols;
  const g = new Float64Array(size).fill(Infinity);
  const parent = new Int32Array(size).fill(-1);
  const closed = new Uint8Array(size);
  const events: StepEvent[] = [];
  const estimate = (node: CellId) => heuristic(options.heuristic, grid.cols, node, end);

  // Lowest f first; among equals, the one that looks closer to the goal, then the older entry.
  const open = new PriorityQueue<Entry>(
    (a, b) => a.f < b.f || (a.f === b.f && (a.h < b.h || (a.h === b.h && a.seq < b.seq))),
  );
  let seq = 0;

  const h0 = estimate(start);
  g[start] = 0;
  open.push({ node: start, f: h0, h: h0, seq: seq++ });
  events.push(
    { type: 'relax', node: start, from: -1, oldDist: Infinity, newDist: 0, line: 1 },
    { type: 'enqueue', node: start, priority: h0, h: h0, line: 1 },
  );

  for (let entry = open.pop(); entry; entry = open.pop()) {
    const u = entry.node;
    if (closed[u]) {
      events.push({ type: 'skip', node: u, reason: 'stale entry', line: 4 });
      continue;
    }
    closed[u] = 1;
    events.push({ type: 'visit', node: u, line: 5 });
    if (u === end) {
      events.push(
        { type: 'found', node: u, line: 6 },
        { type: 'path', nodes: tracePath(parent, end), line: 6 },
      );
      return events;
    }
    for (const v of neighbors(grid, u, options.diagonal)) {
      // Closed cells are never reopened. With a heuristic that overestimates, that is
      // exactly where a cheaper route gets missed.
      if (closed[v]) {
        events.push({ type: 'skip', node: v, reason: 'already closed', line: 7 });
        continue;
      }
      const alt = g[u] + stepCost(grid, u, v);
      if (alt >= g[v]) {
        events.push({ type: 'skip', node: v, reason: 'no improvement', line: 9 });
        continue;
      }
      events.push({ type: 'relax', node: v, from: u, oldDist: g[v], newDist: alt, line: 10 });
      g[v] = alt;
      parent[v] = u;
      const h = estimate(v);
      open.push({ node: v, f: alt + h, h, seq: seq++ });
      events.push({ type: 'enqueue', node: v, priority: alt + h, h, line: 11 });
    }
  }

  events.push({ type: 'noPath', line: 12 });
  return events;
};
