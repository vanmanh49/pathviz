import { latticeOf, openEndpoints } from './shared';
import type { GenEvent, Generator } from './types';

/**
 * Starts from an open grid and keeps splitting it: draw a wall across a
 * chamber, leave one gap in it, then do the same to the two halves.
 */
export const recursiveDivision: Generator = (grid, start, end, rng) => {
  const { rows, cols } = grid;
  const events: GenEvent[] = [{ type: 'fill', wall: false }];
  const wall = (row: number, col: number) =>
    events.push({ type: 'wall', node: row * cols + col, on: true });

  // The outer border, wherever the grid has a wall line along that edge.
  for (let col = 0; col < cols; col++) {
    wall(0, col);
    if (rows % 2 === 1) wall(rows - 1, col);
  }
  for (let row = 1; row < rows - (rows % 2); row++) {
    wall(row, 0);
    if (cols % 2 === 1) wall(row, cols - 1);
  }

  // Chambers are ranges of rooms, inclusive at both ends.
  const divide = (top: number, bottom: number, left: number, right: number) => {
    const height = bottom - top + 1;
    const width = right - left + 1;
    if (height < 2 && width < 2) return;

    const horizontal =
      width < 2 || (height >= 2 && (height > width || (height === width && rng() < 0.5)));
    if (horizontal) {
      const above = top + Math.floor(rng() * (height - 1));
      const gap = left + Math.floor(rng() * width);
      for (let j = left; j <= right; j++) {
        if (j !== gap) wall(2 * above + 2, 2 * j + 1);
        if (j < right) wall(2 * above + 2, 2 * j + 2);
      }
      divide(top, above, left, right);
      divide(above + 1, bottom, left, right);
    } else {
      const before = left + Math.floor(rng() * (width - 1));
      const gap = top + Math.floor(rng() * height);
      for (let i = top; i <= bottom; i++) {
        if (i !== gap) wall(2 * i + 1, 2 * before + 2);
        if (i < bottom) wall(2 * i + 2, 2 * before + 2);
      }
      divide(top, bottom, left, before);
      divide(top, bottom, before + 1, right);
    }
  };

  const lattice = latticeOf(grid);
  divide(0, lattice.rows - 1, 0, lattice.cols - 1);
  return [...events, ...openEndpoints(cols, start, end)];
};
