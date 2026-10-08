import { memo, type CSSProperties } from 'react';
import { Flag, Play } from 'lucide-react';
import type { CellId } from '../algorithms/types';
import { useGridStore } from '../store/gridStore';

const START = -1;
const END = -2;
const WALL = 0;

export const Cell = memo(function Cell({ id }: { id: CellId }) {
  // One primitive per cell, so an edit elsewhere on the grid does not re-render this one.
  const code = useGridStore((s) =>
    s.start === id ? START : s.end === id ? END : s.grid.walls[id] ? WALL : s.grid.weights[id],
  );

  if (code === START || code === END) {
    const Icon = code === START ? Play : Flag;
    return (
      <div
        role="gridcell"
        className="cell"
        data-cell={id}
        data-kind={code === START ? 'start' : 'end'}
      >
        <Icon aria-hidden strokeWidth={2.5} />
      </div>
    );
  }

  const weighted = code > 1;
  return (
    <div
      role="gridcell"
      className="cell"
      data-cell={id}
      data-kind={code === WALL ? 'wall' : weighted ? 'weight' : 'empty'}
      style={weighted ? ({ '--w': code } as CSSProperties) : undefined}
    >
      {weighted ? code : null}
    </div>
  );
});
