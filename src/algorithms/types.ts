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
