import { create } from 'zustand';
import { createGrid, toId } from '../algorithms/grid';
import type { CellId, Grid } from '../algorithms/types';
import { GENERATORS } from '../generators';
import { applyGenEvent } from '../generators/shared';
import { mulberry32 } from '../utils/rng';

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
  /** The weight each endpoint is sitting on, restored when it moves away. */
  covered: { start: number; end: number };
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
  /** Runs a generator. It is drawn over about a second and a half unless `instant` is set. */
  generate(id: string, seed?: number, instant?: boolean): void;
}

// A generated maze is drawn over roughly this many animation frames.
const GENERATION_FRAMES = 90;

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, Math.round(n)));

function blank(rows: number, cols: number) {
  return {
    grid: createGrid(rows, cols),
    ...defaultEndpoints(rows, cols),
    covered: { start: 1, end: 1 },
  };
}

export const useGridStore = create<GridState>((set, get) => {
  // Edits are ignored while a generator is drawing; its events refer to the grid as it was.
  const change = (partial: Partial<GridState>) => {
    if (!get().generating) set(partial);
  };

  // Every edit replaces the grid and its arrays so a per-cell selector sees the change.
  const edit = (id: CellId, wall: number, weight: number) => {
    const { grid, start, end } = get();
    if (id === start || id === end) return;
    if (grid.walls[id] === wall && grid.weights[id] === weight) return;
    const walls = grid.walls.slice();
    const weights = grid.weights.slice();
    walls[id] = wall;
    weights[id] = weight;
    change({ grid: { ...grid, walls, weights } });
  };

  const moveEndpoint = (key: 'start' | 'end', id: CellId) => {
    const { grid, start, end } = get();
    if (id === start || id === end || grid.walls[id]) return;
    const { covered } = get();
    const from = key === 'start' ? start : end;
    if (grid.weights[id] === 1 && covered[key] === 1) return change({ [key]: id });
    // The endpoint's own cell always costs 1; the weight it covers comes back when it leaves.
    const weights = grid.weights.slice();
    weights[from] = covered[key];
    const beneath = weights[id];
    weights[id] = 1;
    change({ [key]: id, grid: { ...grid, weights }, covered: { ...covered, [key]: beneath } });
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
      change({ grid: { ...grid, walls: new Uint8Array(grid.walls.length) } });
    },
    clearWeights: () => {
      const { grid } = get();
      change({
        grid: { ...grid, weights: new Uint8Array(grid.weights.length).fill(1) },
        covered: { start: 1, end: 1 },
      });
    },
    resetAll: () => {
      const { grid } = get();
      change(blank(grid.rows, grid.cols));
    },
    resize: (rows, cols) =>
      change(
        blank(
          clamp(rows, ROW_LIMITS.min, ROW_LIMITS.max),
          clamp(cols, COL_LIMITS.min, COL_LIMITS.max),
        ),
      ),
    generate: (id, seed = Date.now(), instant = false) => {
      const generator = GENERATORS.find((g) => g.id === id);
      if (!generator || get().generating) return;
      const { grid, start, end } = get();
      const events = generator.run(grid, start, end, mulberry32(seed));
      const still =
        instant ||
        (typeof matchMedia === 'function' &&
          matchMedia('(prefers-reduced-motion: reduce)').matches);
      const perFrame = still ? events.length : Math.ceil(events.length / GENERATION_FRAMES);

      let applied = 0;
      const drawFrame = () => {
        const current = get().grid;
        const next = { ...current, walls: current.walls.slice(), weights: current.weights.slice() };
        const until = Math.min(events.length, applied + perFrame);
        while (applied < until) applyGenEvent(next, events[applied++]);
        const done = applied >= events.length;
        set({ grid: next, generating: !done });
        if (!done) requestAnimationFrame(drawFrame);
      };
      set({ generating: true });
      drawFrame();
    },
  };
});
