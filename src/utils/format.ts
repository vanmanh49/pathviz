import { toCoord } from '../algorithms/grid';
import type { CellId } from '../algorithms/types';

/** Whole numbers as they are, fractions to two decimals, and ∞ for an unknown distance. */
export function formatNumber(n: number): string {
  if (!Number.isFinite(n)) return '∞';
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
}

export function formatCell(cols: number, id: CellId): string {
  const { row, col } = toCoord(cols, id);
  return `(${row},${col})`;
}
