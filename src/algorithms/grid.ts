import type { CellId, Grid } from './types';

export function createGrid(rows: number, cols: number): Grid {
  const size = rows * cols;
  return { rows, cols, walls: new Uint8Array(size), weights: new Uint8Array(size).fill(1) };
}

export function toId(cols: number, row: number, col: number): CellId {
  return row * cols + col;
}

export function toCoord(cols: number, id: CellId): { row: number; col: number } {
  return { row: Math.floor(id / cols), col: id % cols };
}

// [row delta, column delta]
const ORTHOGONAL = [
  [-1, 0],
  [0, 1],
  [1, 0],
  [0, -1],
];
const DIAGONAL = [
  [-1, 1],
  [1, 1],
  [1, -1],
  [-1, -1],
];

/**
 * Open cells reachable in one move, always in the order N, E, S, W, NE, SE, SW, NW.
 * A diagonal move needs both cells beside it open, so a path never cuts a wall corner.
 */
export function neighbors(grid: Grid, id: CellId, diagonal: boolean): CellId[] {
  const { rows, cols, walls } = grid;
  const row = Math.floor(id / cols);
  const col = id % cols;
  const open = (r: number, c: number) =>
    r >= 0 && r < rows && c >= 0 && c < cols && !walls[r * cols + c];

  const result: CellId[] = [];
  for (const [dr, dc] of ORTHOGONAL) {
    if (open(row + dr, col + dc)) result.push((row + dr) * cols + col + dc);
  }
  if (diagonal) {
    for (const [dr, dc] of DIAGONAL) {
      if (open(row + dr, col + dc) && open(row + dr, col) && open(row, col + dc)) {
        result.push((row + dr) * cols + col + dc);
      }
    }
  }
  return result;
}

/** Cost of moving between two adjacent cells: the weight of the cell entered, ×√2 diagonally. */
export function stepCost(grid: Grid, from: CellId, to: CellId): number {
  const { cols } = grid;
  const straight = from % cols === to % cols || Math.floor(from / cols) === Math.floor(to / cols);
  return grid.weights[to] * (straight ? 1 : Math.SQRT2);
}

/**
 * Whether `candidate` is a real improvement on `current`. Sums of √2 reach the
 * same cell by different routes with differences in the last few bits; those
 * are not shorter paths and must not be reported as such.
 */
export function improves(candidate: number, current: number): boolean {
  return candidate < current - 1e-9;
}

export function pathCost(grid: Grid, nodes: CellId[]): number {
  let cost = 0;
  for (let i = 1; i < nodes.length; i++) cost += stepCost(grid, nodes[i - 1], nodes[i]);
  return cost;
}

/** Follows parent links back from `end`; the returned path begins at the start node. */
export function tracePath(parent: Int32Array, end: CellId): CellId[] {
  const path: CellId[] = [];
  for (let at = end; at !== -1; at = parent[at]) path.push(at);
  return path.reverse();
}
