import { describe, expect, it } from 'vitest';
import { toId } from './grid';
import { heuristic, isAdmissible } from './heuristics';

const COLS = 10;
const a = toId(COLS, 1, 2);
const b = toId(COLS, 4, 6); // 3 rows and 4 columns away

describe('heuristic', () => {
  it('manhattan adds the row and column distances', () => {
    expect(heuristic('manhattan', COLS, a, b)).toBe(7);
  });

  it('euclidean is the straight-line distance', () => {
    expect(heuristic('euclidean', COLS, a, b)).toBe(5);
  });

  it('chebyshev is the larger of the two distances', () => {
    expect(heuristic('chebyshev', COLS, a, b)).toBe(4);
  });

  it('octile counts diagonal steps at √2', () => {
    expect(heuristic('octile', COLS, a, b)).toBeCloseTo(1 + 3 * Math.SQRT2);
  });

  it('is symmetric and zero at the goal', () => {
    for (const id of ['manhattan', 'euclidean', 'octile', 'chebyshev'] as const) {
      expect(heuristic(id, COLS, b, a)).toBe(heuristic(id, COLS, a, b));
      expect(heuristic(id, COLS, a, a)).toBe(0);
    }
  });
});

describe('isAdmissible', () => {
  it('is false only for manhattan with diagonal movement', () => {
    for (const id of ['manhattan', 'euclidean', 'octile', 'chebyshev'] as const) {
      expect(isAdmissible(id, false)).toBe(true);
      expect(isAdmissible(id, true)).toBe(id !== 'manhattan');
    }
  });
});
