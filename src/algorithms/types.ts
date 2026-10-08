/** A cell's position as a flat index: row * cols + col. */
export type CellId = number;

export interface Grid {
  rows: number;
  cols: number;
  /** 1 = wall */
  walls: Uint8Array;
  /** 1–9, where 1 is a plain cell */
  weights: Uint8Array;
}

export type HeuristicId = 'manhattan' | 'euclidean' | 'octile' | 'chebyshev';

export interface RunOptions {
  diagonal: boolean;
  heuristic: HeuristicId;
}

/** Which half of a bidirectional search an event belongs to: 0 from the start, 1 from the end. */
export type Side = 0 | 1;

export type FrontierKind = 'queue' | 'stack' | 'heap' | 'none';

/** One operation of an algorithm. `line` is the 1-based pseudocode line it corresponds to. */
export type StepEvent =
  | { type: 'visit'; node: CellId; line: number; side?: Side }
  | { type: 'enqueue'; node: CellId; priority?: number; h?: number; line: number; side?: Side }
  | {
      type: 'relax';
      node: CellId;
      /** -1 for the start node */
      from: CellId;
      oldDist: number;
      newDist: number;
      line: number;
      side?: Side;
    }
  | { type: 'skip'; node: CellId; reason: string; line: number }
  | { type: 'pass'; n: number; line: number }
  | { type: 'found'; node: CellId; line: number }
  | { type: 'path'; nodes: CellId[]; line: number }
  | { type: 'noPath'; line: number };

export type Algorithm = (
  grid: Grid,
  start: CellId,
  end: CellId,
  options: RunOptions,
) => StepEvent[];
