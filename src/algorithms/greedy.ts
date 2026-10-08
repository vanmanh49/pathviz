import { neighbors, stepCost, tracePath } from './grid';
import { heuristic } from './heuristics';
import { PriorityQueue } from './priorityQueue';
import type { Algorithm, CellId, StepEvent } from './types';

interface Entry {
  node: CellId;
  h: number;
  seq: number;
}

export const greedy: Algorithm = (grid, start, end, options) => {
  const size = grid.rows * grid.cols;
  // Cost of the route taken to each cell. Recorded for display; it never guides the search.
  const dist = new Float64Array(size).fill(Infinity);
  const parent = new Int32Array(size).fill(-1);
  const events: StepEvent[] = [];
  const estimate = (node: CellId) => heuristic(options.heuristic, grid.cols, node, end);

  const open = new PriorityQueue<Entry>((a, b) => a.h < b.h || (a.h === b.h && a.seq < b.seq));
  let seq = 0;

  const h0 = estimate(start);
  dist[start] = 0;
  open.push({ node: start, h: h0, seq: seq++ });
  events.push(
    { type: 'relax', node: start, from: -1, oldDist: Infinity, newDist: 0, line: 1 },
    { type: 'enqueue', node: start, priority: h0, h: h0, line: 1 },
  );

  for (let entry = open.pop(); entry; entry = open.pop()) {
    const u = entry.node;
    events.push({ type: 'visit', node: u, line: 3 });
    if (u === end) {
      events.push(
        { type: 'found', node: u, line: 4 },
        { type: 'path', nodes: tracePath(parent, end), line: 4 },
      );
      return events;
    }
    for (const v of neighbors(grid, u, options.diagonal)) {
      if (dist[v] !== Infinity) {
        events.push({ type: 'skip', node: v, reason: 'already discovered', line: 6 });
        continue;
      }
      dist[v] = dist[u] + stepCost(grid, u, v);
      parent[v] = u;
      events.push({
        type: 'relax',
        node: v,
        from: u,
        oldDist: Infinity,
        newDist: dist[v],
        line: 7,
      });
      const h = estimate(v);
      open.push({ node: v, h, seq: seq++ });
      events.push({ type: 'enqueue', node: v, priority: h, h, line: 8 });
    }
  }

  events.push({ type: 'noPath', line: 9 });
  return events;
};
