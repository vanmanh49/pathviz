import { useEffect, useRef, type PointerEvent } from 'react';
import { toCoord, toId } from '../algorithms/grid';
import type { CellId } from '../algorithms/types';
import { useGridStore } from '../store/gridStore';
import { useUiStore, type Tool } from '../store/uiStore';

type Mode = Tool | 'start' | 'end';

function cellOf(target: EventTarget | null): CellId {
  const el = target instanceof Element ? target.closest<HTMLElement>('[data-cell]') : null;
  return el ? Number(el.dataset.cell) : -1;
}

/** Cells on the straight line after `from` up to and including `to`. */
function lineBetween(cols: number, from: CellId, to: CellId): CellId[] {
  let { row, col } = toCoord(cols, from);
  const target = toCoord(cols, to);
  const dr = Math.abs(target.row - row);
  const dc = Math.abs(target.col - col);
  const stepRow = Math.sign(target.row - row);
  const stepCol = Math.sign(target.col - col);
  let error = dc - dr;
  const cells: CellId[] = [];
  while (row !== target.row || col !== target.col) {
    const doubled = 2 * error;
    if (doubled > -dr) {
      error -= dr;
      col += stepCol;
    }
    if (doubled < dc) {
      error += dc;
      row += stepRow;
    }
    cells.push(toId(cols, row, col));
  }
  return cells;
}

/** Pointer handlers for drawing on the grid and dragging its endpoints. */
export function useGridPointer() {
  const mode = useRef<Mode | null>(null);
  const last = useRef<CellId>(-1);
  const weightKey = useRef(false);

  useEffect(() => {
    const stop = () => {
      mode.current = null;
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'w' || e.key === 'W') weightKey.current = e.type === 'keydown';
    };
    const onBlur = () => {
      weightKey.current = false;
      stop();
    };
    window.addEventListener('pointerup', stop);
    window.addEventListener('pointercancel', stop);
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onKey);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('pointerup', stop);
      window.removeEventListener('pointercancel', stop);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('keyup', onKey);
      window.removeEventListener('blur', onBlur);
    };
  }, []);

  const apply = (id: CellId) => {
    const grid = useGridStore.getState();
    switch (mode.current) {
      case 'start':
        return grid.moveStart(id);
      case 'end':
        return grid.moveEnd(id);
      case 'wall':
        return grid.setWall(id, true);
      case 'erase':
        return grid.erase(id);
      case 'weight':
        return grid.setWeight(id, useUiStore.getState().brush);
    }
  };

  const onPointerDown = (e: PointerEvent<HTMLElement>) => {
    const id = cellOf(e.target);
    if (id < 0 || e.button !== 0) return;
    // Touch captures the pointer on the first cell; release it so moves report the cell under the finger.
    const el = e.target as Element;
    if (el.hasPointerCapture?.(e.pointerId)) el.releasePointerCapture(e.pointerId);

    const { start, end } = useGridStore.getState();
    if (id === start) mode.current = 'start';
    else if (id === end) mode.current = 'end';
    else if (e.shiftKey) mode.current = 'erase';
    else if (weightKey.current) mode.current = 'weight';
    else mode.current = useUiStore.getState().tool;
    last.current = id;
    apply(id);
  };

  const onPointerMove = (e: PointerEvent<HTMLElement>) => {
    if (!mode.current) return;
    const id = cellOf(e.target);
    if (id < 0 || id === last.current) return;
    if (mode.current === 'start' || mode.current === 'end') {
      apply(id);
    } else {
      lineBetween(useGridStore.getState().grid.cols, last.current, id).forEach(apply);
    }
    last.current = id;
  };

  return { onPointerDown, onPointerMove };
}
