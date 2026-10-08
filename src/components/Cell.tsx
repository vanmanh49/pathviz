import { memo, type CSSProperties } from 'react';
import { motion } from 'framer-motion';
import { Flag, Play } from 'lucide-react';
import type { CellId } from '../algorithms/types';
import { useGridStore } from '../store/gridStore';
import type { Pane } from '../store/uiStore';

const START = -1;
const END = -2;
const WALL = 0;

const GLIDE = { type: 'spring', stiffness: 600, damping: 38 } as const;

function kindOf(code: number): 'start' | 'end' | 'wall' | 'weight' | 'empty' {
  if (code === START) return 'start';
  if (code === END) return 'end';
  if (code === WALL) return 'wall';
  return code > 1 ? 'weight' : 'empty';
}

export const Cell = memo(function Cell({ id, pane }: { id: CellId; pane: Pane }) {
  // One primitive per cell, so an edit elsewhere on the grid does not re-render this one.
  const code = useGridStore((s) =>
    s.start === id ? START : s.end === id ? END : s.grid.walls[id] ? WALL : s.grid.weights[id],
  );
  const cols = useGridStore((s) => s.grid.cols);
  const kind = kindOf(code);
  const where = `Row ${Math.floor(id / cols)}, column ${id % cols}`;

  return (
    <div
      role="gridcell"
      // The grid is a single tab stop; the keyboard hook moves tabindex 0 to the cursor cell.
      tabIndex={-1}
      aria-label={`${where}, ${kind === 'weight' ? `weight ${code}` : kind}`}
      className="cell"
      data-cell={id}
      data-kind={kind}
      style={kind === 'weight' ? ({ '--w': code } as CSSProperties) : undefined}
    >
      {kind === 'start' || kind === 'end' ? (
        // A shared layout id makes the marker glide to its new cell instead of jumping.
        <motion.div layoutId={`${kind}-${pane}`} className="marker" transition={GLIDE}>
          {kind === 'start' ? (
            <Play aria-hidden strokeWidth={2.5} />
          ) : (
            <Flag aria-hidden strokeWidth={2.5} />
          )}
        </motion.div>
      ) : kind === 'weight' ? (
        code
      ) : null}
    </div>
  );
});
