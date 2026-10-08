import type { CellId } from '../algorithms/types';
import { shuffle } from './shared';
import type { GenEvent, Generator } from './types';

const WALL_SHARE = 0.3;

/** Scatters walls over about 30% of the grid. Nothing guarantees a path survives. */
export const randomWalls: Generator = (grid, start, end, rng) => {
  const chosen: CellId[] = [];
  for (let id = 0; id < grid.walls.length; id++) {
    if (id !== start && id !== end && rng() < WALL_SHARE) chosen.push(id);
  }
  return [
    { type: 'fill', wall: false },
    ...shuffle(chosen, rng).map((node): GenEvent => ({ type: 'wall', node, on: true })),
  ];
};
