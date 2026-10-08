import { carve, latticeOf, openEndpoints, roomNear, roomNeighbors } from './shared';
import type { GenEvent, Generator } from './types';

/**
 * Randomised depth-first search: walk to a random unvisited neighbouring room,
 * knocking down the wall on the way, and back up whenever there is none left.
 * Produces long winding corridors with few branches.
 */
export const backtracker: Generator = (grid, start, end, rng) => {
  const lattice = latticeOf(grid);
  const seen = new Uint8Array(lattice.rows * lattice.cols);
  const first = roomNear(grid, start);
  const events: GenEvent[] = [{ type: 'fill', wall: true }, carve(grid, lattice, first, first)[1]];

  const stack = [first];
  seen[first] = 1;
  while (stack.length > 0) {
    const room = stack[stack.length - 1];
    const options = roomNeighbors(lattice, room).filter((next) => !seen[next]);
    if (options.length === 0) {
      stack.pop();
      continue;
    }
    const next = options[Math.floor(rng() * options.length)];
    events.push(...carve(grid, lattice, room, next));
    seen[next] = 1;
    stack.push(next);
  }

  return [...events, ...openEndpoints(grid.cols, start, end)];
};
