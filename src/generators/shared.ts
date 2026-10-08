import { toCoord } from '../algorithms/grid';
import type { CellId, Grid } from '../algorithms/types';
import type { GenEvent } from './types';

export function applyGenEvent(grid: Grid, event: GenEvent): void {
  switch (event.type) {
    case 'fill':
      grid.walls.fill(event.wall ? 1 : 0);
      break;
    case 'wall':
      grid.walls[event.node] = event.on ? 1 : 0;
      break;
    case 'weight':
      grid.weights[event.node] = event.value;
      break;
  }
}

/**
 * Mazes are laid out on a lattice of rooms: room (i, j) is the cell at row
 * 2i + 1, column 2j + 1. The cells between two rooms are walls or passages, and
 * cells with both coordinates even are always wall.
 */
export interface Lattice {
  rows: number;
  cols: number;
}

export function latticeOf(grid: Grid): Lattice {
  return { rows: grid.rows >> 1, cols: grid.cols >> 1 };
}

/** The room containing a cell, or the nearest one. */
export function roomNear(grid: Grid, id: CellId): number {
  const { rows, cols } = latticeOf(grid);
  const { row, col } = toCoord(grid.cols, id);
  return Math.min(rows - 1, row >> 1) * cols + Math.min(cols - 1, col >> 1);
}

export function roomNeighbors({ rows, cols }: Lattice, room: number): number[] {
  const i = Math.floor(room / cols);
  const j = room % cols;
  const result: number[] = [];
  if (i > 0) result.push(room - cols);
  if (j < cols - 1) result.push(room + 1);
  if (i < rows - 1) result.push(room + cols);
  if (j > 0) result.push(room - 1);
  return result;
}

/** Events that open a room and the passage joining it to an adjacent room. */
export function carve(grid: Grid, lattice: Lattice, from: number, to: number): GenEvent[] {
  const cellRow = (room: number) => 2 * Math.floor(room / lattice.cols) + 1;
  const cellCol = (room: number) => 2 * (room % lattice.cols) + 1;
  const passage =
    ((cellRow(from) + cellRow(to)) / 2) * grid.cols + (cellCol(from) + cellCol(to)) / 2;
  return [
    { type: 'wall', node: passage, on: false },
    { type: 'wall', node: cellRow(to) * grid.cols + cellCol(to), on: false },
  ];
}

/**
 * Clears the start and end cells. An endpoint on an intersection of wall lines
 * has no room beside it, so the cell next to it is opened as well.
 */
export function openEndpoints(cols: number, start: CellId, end: CellId): GenEvent[] {
  const events: GenEvent[] = [];
  for (const id of [start, end]) {
    events.push({ type: 'wall', node: id, on: false });
    const { row, col } = toCoord(cols, id);
    if (row % 2 === 0 && col % 2 === 0) {
      events.push({ type: 'wall', node: col + 1 < cols ? id + 1 : id - 1, on: false });
    }
  }
  return events;
}

export function shuffle<T>(items: T[], rng: () => number): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}
