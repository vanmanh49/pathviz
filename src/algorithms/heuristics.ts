import type { CellId, HeuristicId } from './types';

/** Estimated cost between two cells that are `dr` rows and `dc` columns apart. */
const ESTIMATES: Record<HeuristicId, (dr: number, dc: number) => number> = {
  manhattan: (dr, dc) => dr + dc,
  euclidean: (dr, dc) => Math.hypot(dr, dc),
  octile: (dr, dc) => Math.max(dr, dc) + (Math.SQRT2 - 1) * Math.min(dr, dc),
  chebyshev: (dr, dc) => Math.max(dr, dc),
};

export function heuristic(id: HeuristicId, cols: number, a: CellId, b: CellId): number {
  const dr = Math.abs(Math.floor(a / cols) - Math.floor(b / cols));
  const dc = Math.abs((a % cols) - (b % cols));
  return ESTIMATES[id](dr, dc);
}

/**
 * Whether the heuristic never overestimates the true remaining cost, which is
 * what A* needs to return a cheapest path. Every move costs at least 1, or √2
 * diagonally, so only Manhattan fails, and only when diagonal moves are allowed.
 */
export function isAdmissible(id: HeuristicId, diagonal: boolean): boolean {
  return !(id === 'manhattan' && diagonal);
}
