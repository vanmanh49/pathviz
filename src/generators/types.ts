import type { CellId, Grid } from '../algorithms/types';

/** One edit to the grid. A generator's output is a list of these, applied in order. */
export type GenEvent =
  | { type: 'fill'; wall: boolean }
  | { type: 'wall'; node: CellId; on: boolean }
  | { type: 'weight'; node: CellId; value: number };

/** `rng` returns numbers in [0, 1); the same sequence always gives the same output. */
export type Generator = (grid: Grid, start: CellId, end: CellId, rng: () => number) => GenEvent[];
