import { beforeEach, describe, expect, it } from 'vitest';
import { toId } from '../algorithms/grid';
import { defaultEndpoints, defaultSize, useGridStore } from './gridStore';

const s = () => useGridStore.getState();

beforeEach(() => {
  s().resize(25, 50);
});

describe('defaults', () => {
  it('picks a default size from the viewport width', () => {
    expect(defaultSize(1280)).toEqual({ rows: 25, cols: 50 });
    expect(defaultSize(800)).toEqual({ rows: 21, cols: 31 });
    expect(defaultSize(400)).toEqual({ rows: 21, cols: 15 });
  });

  it('places distinct endpoints even on the smallest grid', () => {
    const { start, end } = defaultEndpoints(5, 5);
    expect(start).toBe(toId(5, 2, 1));
    expect(end).toBe(toId(5, 2, 3));
  });
});

describe('editing', () => {
  it('never puts a wall or a weight on an endpoint', () => {
    const { start, end, grid } = s();
    s().setWall(start, true);
    s().setWall(end, true);
    s().setWeight(start, 5);
    s().setWeight(end, 5);
    expect(s().grid).toBe(grid);
  });

  it('setWall clears the weight and setWeight clears the wall', () => {
    s().setWeight(0, 7);
    s().setWall(0, true);
    expect(s().grid.walls[0]).toBe(1);
    expect(s().grid.weights[0]).toBe(1);
    s().setWeight(0, 4);
    expect(s().grid.walls[0]).toBe(0);
    expect(s().grid.weights[0]).toBe(4);
  });

  it('clamps weights to 1–9', () => {
    s().setWeight(0, 42);
    expect(s().grid.weights[0]).toBe(9);
    s().setWeight(0, 0);
    expect(s().grid.weights[0]).toBe(1);
  });

  it('erase removes a wall and resets a weight', () => {
    s().setWall(0, true);
    s().setWeight(1, 6);
    s().erase(0);
    s().erase(1);
    expect(s().grid.walls[0]).toBe(0);
    expect(s().grid.weights[1]).toBe(1);
  });

  it('will not move an endpoint onto a wall or onto the other endpoint', () => {
    const { start, end } = s();
    s().setWall(0, true);
    s().moveStart(0);
    s().moveStart(end);
    s().moveEnd(0);
    s().moveEnd(start);
    expect(s().start).toBe(start);
    expect(s().end).toBe(end);
  });

  it('moves an endpoint to an open cell and clears a weight under it', () => {
    s().setWeight(3, 8);
    s().moveStart(3);
    s().moveEnd(4);
    expect(s().start).toBe(3);
    expect(s().end).toBe(4);
    expect(s().grid.weights[3]).toBe(1);
  });

  it('clearWalls keeps weights and clearWeights keeps walls', () => {
    s().setWall(0, true);
    s().setWeight(1, 5);
    s().clearWalls();
    expect(s().grid.walls[0]).toBe(0);
    expect(s().grid.weights[1]).toBe(5);
    s().setWall(0, true);
    s().clearWeights();
    expect(s().grid.walls[0]).toBe(1);
    expect(s().grid.weights[1]).toBe(1);
  });

  it('resetAll clears the grid and restores the default endpoints', () => {
    s().setWall(0, true);
    s().setWeight(1, 5);
    s().moveStart(2);
    s().resetAll();
    expect(Array.from(s().grid.walls).some(Boolean)).toBe(false);
    expect(Array.from(s().grid.weights).every((w) => w === 1)).toBe(true);
    expect({ start: s().start, end: s().end }).toEqual(defaultEndpoints(25, 50));
  });

  it('resize clamps to 5–40 rows and 5–80 columns and resets the grid', () => {
    s().setWall(0, true);
    s().resize(2, 500);
    expect(s().grid.rows).toBe(5);
    expect(s().grid.cols).toBe(80);
    expect(s().grid.walls).toHaveLength(400);
    expect(s().grid.walls[0]).toBe(0);
    expect({ start: s().start, end: s().end }).toEqual(defaultEndpoints(5, 80));
    s().resize(99, 3);
    expect(s().grid.rows).toBe(40);
    expect(s().grid.cols).toBe(5);
  });

  it('replaces the grid object on every edit', () => {
    const before = s().grid;
    s().setWall(0, true);
    const after = s().grid;
    expect(after).not.toBe(before);
    expect(after.walls).not.toBe(before.walls);
    expect(before.walls[0]).toBe(0);
  });
});
