import { useLayoutEffect, useRef, type CSSProperties } from 'react';
import { cellOf, useGridPointer } from '../hooks/useGridPointer';
import { usePainter } from '../hooks/usePainter';
import { useGridStore } from '../store/gridStore';
import { useUiStore, type Pane } from '../store/uiStore';
import { Cell } from './Cell';

export function Grid({ pane }: { pane: Pane }) {
  const rows = useGridStore((s) => s.grid.rows);
  const cols = useGridStore((s) => s.grid.cols);
  const pointer = useGridPointer();
  const board = useRef<HTMLDivElement>(null);
  const cells = useRef<(HTMLElement | null)[]>([]);

  // Cell elements in id order, for the painter.
  useLayoutEffect(() => {
    cells.current = Array.from(board.current!.querySelectorAll<HTMLElement>('[data-cell]'));
  }, [rows, cols]);

  usePainter(pane, cells);

  const { setInspected } = useUiStore.getState();
  const inspect = (target: EventTarget) => {
    const cell = cellOf(target);
    if (cell >= 0) setInspected({ pane, cell });
  };

  return (
    <div className="grid-fit">
      <div
        ref={board}
        role="grid"
        aria-label="Pathfinding grid"
        aria-rowcount={rows}
        aria-colcount={cols}
        data-tour="grid"
        data-pane={pane}
        className="grid-board"
        style={{ '--rows': rows, '--cols': cols } as CSSProperties}
        {...pointer}
        onPointerOver={(e) => inspect(e.target)}
        onPointerLeave={() => setInspected(null)}
      >
        {Array.from({ length: rows }, (_, row) => (
          <div role="row" key={row} className="contents">
            {Array.from({ length: cols }, (_, col) => (
              <Cell key={col} id={row * cols + col} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
