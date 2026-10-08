import { carve, latticeOf, openEndpoints, roomNear, roomNeighbors } from './shared';
import type { GenEvent, Generator } from './types';

/**
 * Randomised Prim's algorithm: grow the maze outward from one room by
 * repeatedly opening a random wall on its boundary. Produces many short
 * branches and dead ends.
 */
export const prim: Generator = (grid, start, end, rng) => {
  const lattice = latticeOf(grid);
  const seen = new Uint8Array(lattice.rows * lattice.cols);
  const first = roomNear(grid, start);
  const events: GenEvent[] = [{ type: 'fill', wall: true }, carve(grid, lattice, first, first)[1]];

  // Walls between a room already in the maze and one that is not yet.
  const boundary: [inside: number, outside: number][] = [];
  const join = (room: number) => {
    seen[room] = 1;
    for (const next of roomNeighbors(lattice, room)) {
      if (!seen[next]) boundary.push([room, next]);
    }
  };

  join(first);
  while (boundary.length > 0) {
    const pick = Math.floor(rng() * boundary.length);
    const [inside, outside] = boundary[pick];
    boundary[pick] = boundary[boundary.length - 1];
    boundary.pop();
    if (seen[outside]) continue;
    events.push(...carve(grid, lattice, inside, outside));
    join(outside);
  }

  return [...events, ...openEndpoints(grid.cols, start, end)];
};
