import { shuffle } from './shared';
import type { GenEvent, Generator } from './types';

const WEIGHT_SHARE = 0.35;

/** Lays fresh terrain: about 35% of the open cells get a weight from 2 to 9, the rest become plain. */
export const randomWeights: Generator = (grid, start, end, rng) => {
  const events: GenEvent[] = [];
  for (let id = 0; id < grid.walls.length; id++) {
    if (id === start || id === end || grid.walls[id]) continue;
    if (rng() < WEIGHT_SHARE) {
      events.push({ type: 'weight', node: id, value: 2 + Math.floor(rng() * 8) });
    } else if (grid.weights[id] !== 1) {
      events.push({ type: 'weight', node: id, value: 1 });
    }
  }
  return shuffle(events, rng);
};
