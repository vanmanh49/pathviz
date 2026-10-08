import {
  useCallback,
  useLayoutEffect,
  useRef,
  type FocusEvent,
  type KeyboardEvent,
  type MutableRefObject,
} from 'react';
import type { CellId } from '../algorithms/types';
import { useGridStore } from '../store/gridStore';
import { useUiStore, type Pane } from '../store/uiStore';
import { cellOf } from './useGridPointer';

/**
 * Keyboard access to the grid. The whole grid is one tab stop with a cursor
 * cell: the arrow keys move it, Enter toggles a wall, 1–9 sets a weight, and
 * S and E bring the start and end to it.
 */
export function useGridKeyboard(pane: Pane, cells: MutableRefObject<(HTMLElement | null)[]>) {
  const rows = useGridStore((s) => s.grid.rows);
  const cols = useGridStore((s) => s.grid.cols);
  const cursor = useRef<CellId>(-1);

  const moveTo = useCallback(
    (id: CellId, focus: boolean) => {
      cells.current[cursor.current]?.setAttribute('tabindex', '-1');
      cursor.current = id;
      const element = cells.current[id];
      element?.setAttribute('tabindex', '0');
      if (focus) element?.focus();
    },
    [cells],
  );

  // A new grid starts with its tab stop on the start cell. Elements can be reused
  // across a resize, so every cell is reset first.
  useLayoutEffect(() => {
    for (const element of cells.current) element?.setAttribute('tabindex', '-1');
    cursor.current = -1;
    moveTo(useGridStore.getState().start, false);
  }, [rows, cols, cells, moveTo]);

  const onKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    const id = cellOf(e.target);
    if (id < 0 || e.ctrlKey || e.metaKey || e.altKey) return;
    const { grid, setWall, setWeight, moveStart, moveEnd } = useGridStore.getState();
    const row = Math.floor(id / grid.cols);
    const col = id % grid.cols;
    const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;

    if (key === 'ArrowUp') {
      if (row > 0) moveTo(id - grid.cols, true);
    } else if (key === 'ArrowDown') {
      if (row < grid.rows - 1) moveTo(id + grid.cols, true);
    } else if (key === 'ArrowLeft') {
      if (col > 0) moveTo(id - 1, true);
    } else if (key === 'ArrowRight') {
      if (col < grid.cols - 1) moveTo(id + 1, true);
    } else if (key === 'Enter') {
      setWall(id, !grid.walls[id]);
    } else if (/^[1-9]$/.test(key)) {
      setWeight(id, Number(key));
    } else if (key === 's') {
      moveStart(id);
    } else if (key === 'e') {
      moveEnd(id);
    } else {
      return;
    }
    e.preventDefault();
  };

  const onFocus = (e: FocusEvent<HTMLElement>) => {
    const id = cellOf(e.target);
    if (id < 0) return;
    if (id !== cursor.current) moveTo(id, false);
    useUiStore.getState().setInspected({ pane, cell: id });
  };

  return { onKeyDown, onFocus };
}
