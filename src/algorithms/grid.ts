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
