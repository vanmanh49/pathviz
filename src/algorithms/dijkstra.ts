import { neighbors, stepCost, tracePath } from './grid';
import { PriorityQueue } from './priorityQueue';
import type { Algorithm, CellId, StepEvent } from './types';

interface Entry {
  node: CellId;
  dist: number;
  seq: number;
}

export const dijkstra: Algorithm = (grid, start, end, { diagonal }) => {
  const size = grid.rows * grid.cols;
  const dist = new Float64Array(size).fill(Infinity);
  const parent = new Int32Array(size).fill(-1);
  const settled = new Uint8Array(size);
  const events: StepEvent[] = [];

  // Improved cells are pushed again rather than updated in place; the older entry is skipped when it surfaces.
  const queue = new PriorityQueue<Entry>(
    (a, b) => a.dist < b.dist || (a.dist === b.dist && a.seq < b.seq),
  );
  let seq = 0;

  dist[start] = 0;
  queue.push({ node: start, dist: 0, seq: seq++ });
  events.push(
    { type: 'relax', node: start, from: -1, oldDist: Infinity, newDist: 0, line: 1 },
    { type: 'enqueue', node: start, priority: 0, line: 1 },
  );

  for (let entry = queue.pop(); entry; entry = queue.pop()) {
    const u = entry.node;
    if (settled[u]) {
      events.push({ type: 'skip', node: u, reason: 'stale entry', line: 4 });
      continue;
    }
    settled[u] = 1;
    events.push({ type: 'visit', node: u, line: 5 });
    if (u === end) {
      events.push(
        { type: 'found', node: u, line: 6 },
        { type: 'path', nodes: tracePath(parent, end), line: 6 },
      );
      return events;
    }
    for (const v of neighbors(grid, u, diagonal)) {
      if (settled[v]) {
        events.push({ type: 'skip', node: v, reason: 'already settled', line: 7 });
        continue;
      }
      const alt = dist[u] + stepCost(grid, u, v);
      if (alt >= dist[v]) {
        events.push({ type: 'skip', node: v, reason: 'no improvement', line: 9 });
        continue;
      }
      events.push({ type: 'relax', node: v, from: u, oldDist: dist[v], newDist: alt, line: 10 });
      dist[v] = alt;
      parent[v] = u;
      queue.push({ node: v, dist: alt, seq: seq++ });
      events.push({ type: 'enqueue', node: v, priority: alt, line: 11 });
    }
  }

  events.push({ type: 'noPath', line: 12 });
  return events;
};
