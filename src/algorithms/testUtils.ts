import { expect } from 'vitest';
import { createGrid, neighbors, pathCost, toId } from './grid';
import type { CellId, Grid, StepEvent } from './types';

export interface Case {
  grid: Grid;
  start: CellId;
  end: CellId;
}

/** Builds a grid from text: '.' open, '#' wall, 'S' start, 'E' end, '2'–'9' a weight. */
export function parseGrid(rows: string[]): Case {
  const grid = createGrid(rows.length, rows[0].length);
  let start = -1;
  let end = -1;
  rows.forEach((line, row) => {
    [...line].forEach((ch, col) => {
      const id = toId(grid.cols, row, col);
      if (ch === '#') grid.walls[id] = 1;
      else if (ch === 'S') start = id;
      else if (ch === 'E') end = id;
      else if (ch >= '2' && ch <= '9') grid.weights[id] = Number(ch);
    });
  });
  return { grid, start, end };
}

export function outcome(
  grid: Grid,
  events: StepEvent[],
): { path: CellId[] | null; steps: number | null; cost: number | null } {
  const event = events.find((e) => e.type === 'path');
  if (event?.type !== 'path') return { path: null, steps: null, cost: null };
  return { path: event.nodes, steps: event.nodes.length - 1, cost: pathCost(grid, event.nodes) };
}

export function expectLegalPath(
  grid: Grid,
  path: CellId[],
  start: CellId,
  end: CellId,
  diagonal: boolean,
): void {
  expect(path[0]).toBe(start);
  expect(path[path.length - 1]).toBe(end);
  path.forEach((id, i) => {
    expect(grid.walls[id]).toBe(0);
    if (i > 0) expect(neighbors(grid, path[i - 1], diagonal)).toContain(id);
  });
}

export function randomCase(
  rng: () => number,
  rows: number,
  cols: number,
  rates: { wall: number; weight: number },
): Case {
  const grid = createGrid(rows, cols);
  const size = rows * cols;
  const start = Math.floor(rng() * size);
  let end = Math.floor(rng() * (size - 1));
  if (end >= start) end++;
  for (let id = 0; id < size; id++) {
    if (id === start || id === end) continue;
    if (rng() < rates.wall) grid.walls[id] = 1;
    else if (rng() < rates.weight) grid.weights[id] = 2 + Math.floor(rng() * 8);
  }
  return { grid, start, end };
}
