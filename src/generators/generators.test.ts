import { describe, expect, it } from 'vitest';
import { bfs } from '../algorithms/bfs';
import { createGrid, neighbors, toId } from '../algorithms/grid';
import type { CellId, Grid } from '../algorithms/types';
import { defaultEndpoints } from '../store/gridStore';
import { mulberry32 } from '../utils/rng';
import { GENERATORS } from './index';
import { applyGenEvent, openEndpoints } from './shared';

const MAZES = ['recursive-division', 'backtracker', 'prim'];
const SIZES: [number, number][] = [
  [25, 50],
  [21, 15],
  [24, 31],
  [5, 5],
];
const SEEDS = Array.from({ length: 20 }, (_, i) => i + 1);
const OPTIONS = { diagonal: false, heuristic: 'manhattan' } as const;

interface Endpoints {
  start: CellId;
  end: CellId;
}

function build(id: string, rows: number, cols: number, seed: number, at?: Endpoints, base?: Grid) {
  const grid = base ?? createGrid(rows, cols);
  const { start, end } = at ?? defaultEndpoints(rows, cols);
  const generator = GENERATORS.find((g) => g.id === id)!;
  const events = generator.run(grid, start, end, mulberry32(seed));
  for (const event of events) applyGenEvent(grid, event);
  return { grid, start, end, events };
}

const solvable = ({ grid, start, end }: { grid: Grid } & Endpoints) =>
  bfs(grid, start, end, OPTIONS).some((e) => e.type === 'path');

/** Open cells reachable from `from`. */
function reach(grid: Grid, from: CellId): Set<CellId> {
  const seen = new Set([from]);
  const queue = [from];
  for (const u of queue) {
    for (const v of neighbors(grid, u, false)) {
      if (!seen.has(v)) {
        seen.add(v);
        queue.push(v);
      }
    }
  }
  return seen;
}

const openCount = (grid: Grid) => grid.walls.reduce((n, wall) => n + (wall ? 0 : 1), 0);

it('offers the five generators', () => {
  expect(GENERATORS.map((g) => g.id)).toEqual([
    'recursive-division',
    'backtracker',
    'prim',
    'random-walls',
    'random-weights',
  ]);
  for (const generator of GENERATORS) expect(generator.name).not.toBe('');
});

describe('applyGenEvent', () => {
  it('fill sets or clears every wall and leaves weights alone', () => {
    const grid = createGrid(3, 3);
    grid.weights[4] = 7;
    applyGenEvent(grid, { type: 'fill', wall: true });
    expect(Array.from(grid.walls)).toEqual(Array(9).fill(1));
    expect(grid.weights[4]).toBe(7);
    applyGenEvent(grid, { type: 'fill', wall: false });
    expect(Array.from(grid.walls)).toEqual(Array(9).fill(0));
  });

  it('wall and weight change a single cell', () => {
    const grid = createGrid(3, 3);
    applyGenEvent(grid, { type: 'wall', node: 2, on: true });
    applyGenEvent(grid, { type: 'weight', node: 5, value: 6 });
    expect(grid.walls[2]).toBe(1);
    expect(grid.weights[5]).toBe(6);
    applyGenEvent(grid, { type: 'wall', node: 2, on: false });
    expect(grid.walls[2]).toBe(0);
  });
});

describe('openEndpoints', () => {
  it('clears an endpoint that sits on a room', () => {
    expect(openEndpoints(7, toId(7, 1, 1), toId(7, 5, 5))).toEqual([
      { type: 'wall', node: toId(7, 1, 1), on: false },
      { type: 'wall', node: toId(7, 5, 5), on: false },
    ]);
  });

  it('also opens a way out for an endpoint on a wall intersection', () => {
    const events = openEndpoints(7, toId(7, 2, 2), toId(7, 6, 6));
    expect(events).toContainEqual({ type: 'wall', node: toId(7, 2, 3), on: false });
    expect(events).toContainEqual({ type: 'wall', node: toId(7, 6, 5), on: false });
  });
});

describe.each(GENERATORS.map((g) => g.id))('%s', (id) => {
  it('leaves the start and end cells open', () => {
    for (const [rows, cols] of SIZES) {
      for (const seed of SEEDS.slice(0, 8)) {
        const { grid, start, end } = build(id, rows, cols, seed);
        expect(grid.walls[start]).toBe(0);
        expect(grid.walls[end]).toBe(0);
        expect(grid.weights[start]).toBe(1);
        expect(grid.weights[end]).toBe(1);
      }
    }
  });

  it('gives the same events for the same seed', () => {
    expect(build(id, 21, 15, 7).events).toEqual(build(id, 21, 15, 7).events);
  });

  it('gives a different result for a different seed', () => {
    expect(build(id, 21, 15, 1).events).not.toEqual(build(id, 21, 15, 2).events);
  });

  it('only refers to cells inside the grid', () => {
    for (const [rows, cols] of SIZES) {
      for (const event of build(id, rows, cols, 3).events) {
        if (event.type === 'fill') continue;
        expect(event.node).toBeGreaterThanOrEqual(0);
        expect(event.node).toBeLessThan(rows * cols);
      }
    }
  });
});

describe.each(MAZES)('%s maze', (id) => {
  it('is always solvable', () => {
    for (const [rows, cols] of SIZES) {
      for (const seed of SEEDS) expect(solvable(build(id, rows, cols, seed))).toBe(true);
    }
  });

  it('stays solvable with the endpoints in opposite corners', () => {
    for (const [rows, cols] of SIZES) {
      const corners = { start: 0, end: rows * cols - 1 };
      for (const seed of SEEDS) expect(solvable(build(id, rows, cols, seed, corners))).toBe(true);
    }
  });

  it('connects every room', () => {
    const rows = 21;
    const cols = 31;
    const { grid } = build(id, rows, cols, 5, { start: toId(cols, 1, 1), end: toId(cols, 19, 29) });
    const reached = reach(grid, toId(cols, 1, 1));
    for (let row = 1; row < rows; row += 2) {
      for (let col = 1; col < cols; col += 2) expect(reached.has(toId(cols, row, col))).toBe(true);
    }
  });

  it('builds real walls', () => {
    const { grid } = build(id, 21, 31, 5);
    expect(openCount(grid)).toBeLessThan(21 * 31 * 0.75);
  });
});

describe.each(['backtracker', 'prim'])('%s', (id) => {
  it('carves a perfect maze: one route between any two rooms', () => {
    const rows = 21;
    const cols = 31;
    const rooms = 10 * 15;
    const { grid } = build(id, rows, cols, 9, { start: toId(cols, 1, 1), end: toId(cols, 19, 29) });
    // A spanning tree over the rooms opens exactly one passage per room after the first.
    expect(openCount(grid)).toBe(rooms + rooms - 1);
  });
});

describe('recursive-division', () => {
  it('walls off the top and left edges', () => {
    const cols = 31;
    const { grid } = build('recursive-division', 21, cols, 4, {
      start: toId(cols, 1, 1),
      end: toId(cols, 19, 29),
    });
    for (let col = 0; col < cols; col++) expect(grid.walls[toId(cols, 0, col)]).toBe(1);
    for (let row = 0; row < 21; row++) expect(grid.walls[toId(cols, row, 0)]).toBe(1);
  });
});

describe('random-walls', () => {
  it('fills between 20% and 40% of the grid', () => {
    for (const seed of SEEDS) {
      const { grid } = build('random-walls', 25, 50, seed);
      const share = 1 - openCount(grid) / (25 * 50);
      expect(share).toBeGreaterThan(0.2);
      expect(share).toBeLessThan(0.4);
    }
  });

  it('replaces the walls that were there', () => {
    const base = createGrid(5, 5);
    base.walls.fill(1);
    const { grid } = build('random-walls', 5, 5, 1, undefined, base);
    expect(openCount(grid)).toBeGreaterThan(10);
  });
});

describe('random-weights', () => {
  it('adds no walls and only weights from 2 to 9', () => {
    const { grid, events } = build('random-weights', 25, 50, 2);
    expect(events.length).toBeGreaterThan(300);
    for (const event of events) {
      expect(event.type).toBe('weight');
      if (event.type === 'weight') {
        expect(event.value).toBeGreaterThanOrEqual(2);
        expect(event.value).toBeLessThanOrEqual(9);
      }
    }
    expect(openCount(grid)).toBe(25 * 50);
  });

  it('never weights a wall', () => {
    const base = createGrid(10, 10);
    for (let id = 0; id < 30; id++) base.walls[id] = 1;
    const { events } = build('random-weights', 10, 10, 3, undefined, base);
    for (const event of events) {
      expect(event.type === 'weight' && event.node >= 30).toBe(true);
    }
  });
});
