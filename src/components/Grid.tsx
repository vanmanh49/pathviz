import { useLayoutEffect, useRef, type CSSProperties } from 'react';
import { useGridKeyboard } from '../hooks/useGridKeyboard';
import { cellOf, useGridPointer } from '../hooks/useGridPointer';
import { usePainter } from '../hooks/usePainter';
import { getAlgorithm } from '../data/algorithms';
import { useGridStore } from '../store/gridStore';
import { usePlaybackStore } from '../store/playbackStore';
import { useUiStore, type Pane } from '../store/uiStore';
import { Cell } from './Cell';

export function Grid({ pane }: { pane: Pane }) {
  const rows = useGridStore((s) => s.grid.rows);
  const cols = useGridStore((s) => s.grid.cols);
  const pointer = useGridPointer();
  const compare = usePlaybackStore((s) => s.compare);
  const algorithmId = usePlaybackStore((s) => s.panes[pane].algorithmId);
  const letter = pane === 0 ? 'A' : 'B';
  const board = useRef<HTMLDivElement>(null);
  const cells = useRef<(HTMLElement | null)[]>([]);

  // Cell elements in id order, for the painter.
  useLayoutEffect(() => {
    cells.current = Array.from(board.current!.querySelectorAll<HTMLElement>('[data-cell]'));
  }, [rows, cols]);

  usePainter(pane, cells);
  const keyboard = useGridKeyboard(pane, cells);

  const { setInspected } = useUiStore.getState();
  const inspect = (target: EventTarget) => {
    const cell = cellOf(target);
    if (cell >= 0) setInspected({ pane, cell });
  };

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-1.5">
      {compare && (
        <h2 className="text-sm font-medium">
          {letter} · {getAlgorithm(algorithmId).name}
        </h2>
      )}
      <div className="grid-fit">
        <div
          ref={board}
          role="grid"
          aria-label={compare ? `Pathfinding grid ${letter}` : 'Pathfinding grid'}
          aria-rowcount={rows}
          aria-colcount={cols}
          data-tour="grid"
          data-pane={pane}
          className="grid-board"
          style={{ '--rows': rows, '--cols': cols } as CSSProperties}
          {...pointer}
          {...keyboard}
          onPointerOver={(e) => inspect(e.target)}
          onPointerLeave={() => setInspected(null)}
        >
          {Array.from({ length: rows }, (_, row) => (
            <div role="row" key={row} className="contents">
              {Array.from({ length: cols }, (_, col) => (
                <Cell key={col} id={row * cols + col} pane={pane} />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
