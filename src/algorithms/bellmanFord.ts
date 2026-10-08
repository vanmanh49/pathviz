import { neighbors, stepCost, tracePath } from './grid';
import type { Algorithm, StepEvent } from './types';

export const bellmanFord: Algorithm = (grid, start, end, { diagonal }) => {
  const size = grid.rows * grid.cols;
  const dist = new Float64Array(size).fill(Infinity);
  const parent = new Int32Array(size).fill(-1);
  const events: StepEvent[] = [];

  dist[start] = 0;
  events.push({ type: 'relax', node: start, from: -1, oldDist: Infinity, newDist: 0, line: 1 });

  for (let pass = 1; pass < size; pass++) {
    events.push({ type: 'pass', n: pass, line: 2 });
    let changed = false;

    for (let u = 0; u < size; u++) {
      if (dist[u] === Infinity) continue;
      // Only cells that improve a neighbour are announced; reporting every cell in
      // every pass would bury the relaxations that matter.
      let announced = false;
      for (const v of neighbors(grid, u, diagonal)) {
        const alt = dist[u] + stepCost(grid, u, v);
        if (alt >= dist[v]) continue;
        if (!announced) {
          events.push({ type: 'visit', node: u, line: 3 });
          announced = true;
        }
        events.push({ type: 'relax', node: v, from: u, oldDist: dist[v], newDist: alt, line: 6 });
        dist[v] = alt;
        parent[v] = u;
        changed = true;
      }
    }

    if (!changed) break;
  }

  if (dist[end] === Infinity) {
    events.push({ type: 'noPath', line: 8 });
  } else {
    events.push(
      { type: 'found', node: end, line: 8 },
      { type: 'path', nodes: tracePath(parent, end), line: 8 },
    );
  }
  return events;
};
