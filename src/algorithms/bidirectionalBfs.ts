import { neighbors, tracePath } from './grid';
import type { Algorithm, CellId, Side, StepEvent } from './types';

export const bidirectionalBfs: Algorithm = (grid, start, end, { diagonal }) => {
  const size = grid.rows * grid.cols;
  // Index 0 belongs to the search from the start, 1 to the search from the end.
  const dist = [new Float64Array(size).fill(Infinity), new Float64Array(size).fill(Infinity)];
  const parent = [new Int32Array(size).fill(-1), new Int32Array(size).fill(-1)];
  const level: CellId[][] = [[start], [end]];
  const events: StepEvent[] = [];

  dist[0][start] = 0;
  dist[1][end] = 0;
  events.push(
    { type: 'relax', node: start, from: -1, oldDist: Infinity, newDist: 0, line: 1, side: 0 },
    { type: 'enqueue', node: start, line: 1, side: 0 },
    { type: 'relax', node: end, from: -1, oldDist: Infinity, newDist: 0, line: 1, side: 1 },
    { type: 'enqueue', node: end, line: 1, side: 1 },
  );

  let side: Side = 0;
  while (level[0].length > 0 && level[1].length > 0) {
    const other: Side = side === 0 ? 1 : 0;
    const next: CellId[] = [];
    // The whole level is finished before stopping: the first contact found is not
    // necessarily the shortest join, but the best one in this level is.
    let meeting: { near: CellId; far: CellId; steps: number } | null = null;

    for (const u of level[side]) {
      events.push({ type: 'visit', node: u, line: 3, side });
      for (const v of neighbors(grid, u, diagonal)) {
        if (dist[other][v] !== Infinity) {
          events.push({ type: 'skip', node: v, reason: 'reached by the other search', line: 5 });
          const steps = dist[side][u] + 1 + dist[other][v];
          if (!meeting || steps < meeting.steps) meeting = { near: u, far: v, steps };
        } else if (dist[side][v] !== Infinity) {
          events.push({ type: 'skip', node: v, reason: 'already seen', line: 6 });
        } else {
          dist[side][v] = dist[side][u] + 1;
          parent[side][v] = u;
          next.push(v);
          events.push(
            {
              type: 'relax',
              node: v,
              from: u,
              oldDist: Infinity,
              newDist: dist[side][v],
              line: 7,
              side,
            },
            { type: 'enqueue', node: v, line: 7, side },
          );
        }
      }
    }

    if (meeting) {
      const mine = tracePath(parent[side], meeting.near);
      const theirs = tracePath(parent[other], meeting.far);
      const nodes = side === 0 ? [...mine, ...theirs.reverse()] : [...theirs, ...mine.reverse()];
      events.push({ type: 'found', node: meeting.far, line: 8 }, { type: 'path', nodes, line: 8 });
      return events;
    }

    level[side] = next;
    side = other;
  }

  events.push({ type: 'noPath', line: 10 });
  return events;
};
