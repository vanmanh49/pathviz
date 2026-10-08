import { neighbors, tracePath } from './grid';
import type { Algorithm, CellId, StepEvent } from './types';

export const bfs: Algorithm = (grid, start, end, { diagonal }) => {
  const size = grid.rows * grid.cols;
  const dist = new Float64Array(size).fill(Infinity);
  const parent = new Int32Array(size).fill(-1);
  const events: StepEvent[] = [];

  const queue: CellId[] = [start];
  dist[start] = 0;
  events.push(
    { type: 'relax', node: start, from: -1, oldDist: Infinity, newDist: 0, line: 1 },
    { type: 'enqueue', node: start, line: 1 },
  );

  for (let head = 0; head < queue.length; head++) {
    const u = queue[head];
    events.push({ type: 'visit', node: u, line: 3 });
    if (u === end) {
      events.push(
        { type: 'found', node: u, line: 4 },
        { type: 'path', nodes: tracePath(parent, end), line: 4 },
      );
      return events;
    }
    for (const v of neighbors(grid, u, diagonal)) {
      if (dist[v] !== Infinity) {
        events.push({ type: 'skip', node: v, reason: 'already discovered', line: 6 });
        continue;
      }
      dist[v] = dist[u] + 1;
      parent[v] = u;
      events.push(
        { type: 'relax', node: v, from: u, oldDist: Infinity, newDist: dist[v], line: 7 },
        { type: 'enqueue', node: v, line: 8 },
      );
      queue.push(v);
    }
  }

  events.push({ type: 'noPath', line: 9 });
  return events;
};
