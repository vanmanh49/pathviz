import { create } from 'zustand';
import { createGrid, toId } from '../algorithms/grid';
import type { CellId, Grid } from '../algorithms/types';

export const ROW_LIMITS = { min: 5, max: 40 };
export const COL_LIMITS = { min: 5, max: 80 };

export function defaultSize(viewportWidth: number): { rows: number; cols: number } {
  if (viewportWidth < 640) return { rows: 21, cols: 15 };
  if (viewportWidth < 1024) return { rows: 21, cols: 31 };
  return { rows: 25, cols: 50 };
}

export function defaultEndpoints(rows: number, cols: number): { start: CellId; end: CellId } {
  const row = Math.floor(rows / 2);
  const inset = Math.floor(cols / 4);
  return { start: toId(cols, row, inset), end: toId(cols, row, cols - 1 - inset) };
}

interface GridState {
  grid: Grid;
  start: CellId;
  end: CellId;
  diagonal: boolean;
  generating: boolean;
  setWall(id: CellId, on: boolean): void;
  setWeight(id: CellId, value: number): void;
  erase(id: CellId): void;
  moveStart(id: CellId): void;
  moveEnd(id: CellId): void;
  setDiagonal(on: boolean): void;
  clearWalls(): void;
  clearWeights(): void;
  resetAll(): void;
  resize(rows: number, cols: number): void;
}

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, Math.round(n)));

function blank(rows: number, cols: number) {
  return { grid: createGrid(rows, cols), ...defaultEndpoints(rows, cols) };
}

export const useGridStore = create<GridState>((set, get) => {
  // Every edit replaces the grid and its arrays so a per-cell selector sees the change.
  const edit = (id: CellId, wall: number, weight: number) => {
    const { grid, start, end } = get();
    if (id === start || id === end) return;
    if (grid.walls[id] === wall && grid.weights[id] === weight) return;
    const walls = grid.walls.slice();
    const weights = grid.weights.slice();
    walls[id] = wall;
    weights[id] = weight;
    set({ grid: { ...grid, walls, weights } });
  };

  const moveEndpoint = (key: 'start' | 'end', id: CellId) => {
    const { grid, start, end } = get();
    if (id === start || id === end || grid.walls[id]) return;
    if (grid.weights[id] === 1) return set({ [key]: id } as Pick<GridState, 'start' | 'end'>);
    const weights = grid.weights.slice();
    weights[id] = 1;
    set({ [key]: id, grid: { ...grid, weights } } as Pick<GridState, 'start' | 'end' | 'grid'>);
  };

  const initial = defaultSize(typeof window === 'undefined' ? 1280 : window.innerWidth);

  return {
    ...blank(initial.rows, initial.cols),
    diagonal: false,
    generating: false,
    setWall: (id, on) => edit(id, on ? 1 : 0, on ? 1 : get().grid.weights[id]),
    setWeight: (id, value) => edit(id, 0, clamp(value, 1, 9)),
    erase: (id) => edit(id, 0, 1),
    moveStart: (id) => moveEndpoint('start', id),
    moveEnd: (id) => moveEndpoint('end', id),
    setDiagonal: (diagonal) => set({ diagonal }),
    clearWalls: () => {
      const { grid } = get();
      set({ grid: { ...grid, walls: new Uint8Array(grid.walls.length) } });
    },
    clearWeights: () => {
      const { grid } = get();
      set({ grid: { ...grid, weights: new Uint8Array(grid.weights.length).fill(1) } });
    },
    resetAll: () => {
      const { grid } = get();
      set(blank(grid.rows, grid.cols));
    },
    resize: (rows, cols) =>
      set(
        blank(
          clamp(rows, ROW_LIMITS.min, ROW_LIMITS.max),
          clamp(cols, COL_LIMITS.min, COL_LIMITS.max),
        ),
      ),
  };
});
