import { describe, expect, it } from 'vitest';
import { neighbors, pathCost, stepCost, toCoord, toId, tracePath } from './grid';
import { parseGrid } from './testUtils';

const at = (cols: number, row: number, col: number) => toId(cols, row, col);

describe('coordinates', () => {
  it('converts between ids and coordinates', () => {
    expect(toId(50, 4, 7)).toBe(207);
    expect(toCoord(50, 207)).toEqual({ row: 4, col: 7 });
  });
});

describe('neighbors', () => {
  it('lists orthogonal neighbours as N, E, S, W', () => {
    const { grid } = parseGrid(['...', '...', '...']);
    expect(neighbors(grid, at(3, 1, 1), false)).toEqual([
      at(3, 0, 1),
      at(3, 1, 2),
      at(3, 2, 1),
      at(3, 1, 0),
    ]);
  });

  it('adds diagonals as NE, SE, SW, NW after the orthogonal ones', () => {
    const { grid } = parseGrid(['...', '...', '...']);
    expect(neighbors(grid, at(3, 1, 1), true).slice(4)).toEqual([
      at(3, 0, 2),
      at(3, 2, 2),
      at(3, 2, 0),
      at(3, 0, 0),
    ]);
  });

  it('leaves out walls and cells beyond the edge', () => {
    const { grid } = parseGrid(['.#', '..']);
    expect(neighbors(grid, at(2, 0, 0), false)).toEqual([at(2, 1, 0)]);
  });

  it('does not wrap from the end of one row to the start of the next', () => {
    const { grid } = parseGrid(['...', '...']);
    expect(neighbors(grid, at(3, 0, 2), false)).toEqual([at(3, 1, 2), at(3, 0, 1)]);
  });

  it('allows a diagonal only when both cells beside it are open', () => {
    const { grid } = parseGrid(['..', '#.']);
    expect(neighbors(grid, at(2, 0, 0), true)).toEqual([at(2, 0, 1)]);
    const open = parseGrid(['..', '..']).grid;
    expect(neighbors(open, at(2, 0, 0), true)).toContain(at(2, 1, 1));
  });
});

describe('costs', () => {
  it('charges the weight of the cell being entered', () => {
    const { grid } = parseGrid(['.7']);
    expect(stepCost(grid, 0, 1)).toBe(7);
    expect(stepCost(grid, 1, 0)).toBe(1);
  });

  it('multiplies a diagonal move by √2', () => {
    const { grid } = parseGrid(['..', '.3']);
    expect(stepCost(grid, 0, 3)).toBeCloseTo(3 * Math.SQRT2);
  });

  it('sums the steps of a path', () => {
    const { grid } = parseGrid(['.2.', '...']);
    expect(pathCost(grid, [0, 1, 2])).toBe(3);
    expect(pathCost(grid, [0])).toBe(0);
  });
});

describe('tracePath', () => {
  it('follows parents back to the start and returns the path start first', () => {
    const parent = Int32Array.from([-1, 0, 1, 2]);
    expect(tracePath(parent, 3)).toEqual([0, 1, 2, 3]);
  });
});
