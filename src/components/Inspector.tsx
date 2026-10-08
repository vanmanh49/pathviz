import type { ReactNode } from 'react';
import { getAlgorithm } from '../data/algorithms';
import { DISCOVERED, FRONTIER, VISITED } from '../engine/playback';
import { useGridStore } from '../store/gridStore';
import { usePlaybackStore } from '../store/playbackStore';
import { useUiStore } from '../store/uiStore';
import { formatCell, formatNumber } from '../utils/format';
import { Facts, Panel } from './Panel';

const STATES: Record<number, string> = {
  [DISCOVERED]: 'Discovered',
  [FRONTIER]: 'In frontier',
  [VISITED]: 'Visited',
};

/** Details of the cell under the pointer or the keyboard cursor. */
export function Inspector() {
  const inspected = useUiStore((s) => s.inspected);
  const grid = useGridStore((s) => s.grid);
  const pane = inspected?.pane ?? 0;
  const run = usePlaybackStore((s) => s.runs?.[pane] ?? null);
  const algorithmId = usePlaybackStore((s) => s.panes[pane].algorithmId);
  // The run's state changes in place, so the step index is what signals a change.
  usePlaybackStore((s) => s.index);

  if (!inspected || inspected.cell >= grid.walls.length) {
    return (
      <Panel label="Inspector" title="Inspector">
        <p className="text-sm text-muted">Hover a cell to inspect it.</p>
      </Panel>
    );
  }

  const { cell } = inspected;
  const state = run?.playback.state;
  const status = state?.status[cell] ?? 0;
  const g = state?.dist[cell] ?? Infinity;
  const parent = state?.parent[cell] ?? -1;
  const onPath = state?.path?.includes(cell) ?? false;

  const items: [string, ReactNode][] = [
    ['Cell', formatCell(grid.cols, cell)],
    ['Weight', grid.walls[cell] ? 'Wall' : grid.weights[cell]],
    ['State', onPath ? 'On path' : (STATES[status] ?? 'Not reached')],
    ['g (distance)', formatNumber(g)],
  ];
  if ((run?.info ?? getAlgorithm(algorithmId)).usesHeuristic) {
    // h is only known once the cell has been put in the frontier.
    const ranked = status === FRONTIER || status === VISITED;
    const h = state?.h[cell] ?? 0;
    items.push(['h', ranked ? formatNumber(h) : '—'], ['f', ranked ? formatNumber(g + h) : '—']);
  }
  items.push(['Parent', parent >= 0 ? formatCell(grid.cols, parent) : '—']);

  return (
    <Panel label="Inspector" title="Inspector">
      <Facts items={items} />
    </Panel>
  );
}
