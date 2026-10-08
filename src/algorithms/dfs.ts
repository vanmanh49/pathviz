import { neighbors, tracePath } from './grid';
import type { Algorithm, CellId, StepEvent } from './types';

export const dfs: Algorithm = (grid, start, end, { diagonal }) => {
  const size = grid.rows * grid.cols;
  // Depth along the route DFS took to reach each cell, not a shortest distance.
  const dist = new Float64Array(size).fill(Infinity);
  const parent = new Int32Array(size).fill(-1);
  const visited = new Uint8Array(size);
  const events: StepEvent[] = [];

  const stack: CellId[] = [start];
  dist[start] = 0;
  events.push(
    { type: 'relax', node: start, from: -1, oldDist: Infinity, newDist: 0, line: 1 },
    { type: 'enqueue', node: start, line: 1 },
  );

  while (stack.length > 0) {
    const u = stack.pop()!;
    if (visited[u]) {
      events.push({ type: 'skip', node: u, reason: 'already visited', line: 4 });
      continue;
    }
    visited[u] = 1;
    events.push({ type: 'visit', node: u, line: 5 });
    if (u === end) {
      events.push(
        { type: 'found', node: u, line: 6 },
        { type: 'path', nodes: tracePath(parent, end), line: 6 },
      );
      return events;
    }
    // Pushed in reverse so the first neighbour ends up on top and is explored first.
    const around = neighbors(grid, u, diagonal);
    for (let i = around.length - 1; i >= 0; i--) {
      const v = around[i];
      if (visited[v]) {
        events.push({ type: 'skip', node: v, reason: 'already visited', line: 8 });
        continue;
      }
      events.push({
        type: 'relax',
        node: v,
        from: u,
        oldDist: dist[v],
        newDist: dist[u] + 1,
        line: 9,
      });
      dist[v] = dist[u] + 1;
      parent[v] = u;
      stack.push(v);
      events.push({ type: 'enqueue', node: v, line: 9 });
    }
  }

  events.push({ type: 'noPath', line: 10 });
  return events;
};
