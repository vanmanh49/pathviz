import type { CellId, FrontierKind, StepEvent } from '../algorithms/types';
import { formatCell, formatNumber } from '../utils/format';
import type { PlaybackState } from './playback';

export interface NarrationContext {
  cols: number;
  frontier: FrontierKind;
  end: CellId;
}

const STRUCTURE: Record<FrontierKind, string> = {
  queue: 'queue',
  stack: 'stack',
  heap: 'priority queue',
  none: '',
};

/**
 * One plain-English sentence for the step that produced `state`.
 * `event` is undefined before the first step.
 */
export function narrate(
  event: StepEvent | undefined,
  state: PlaybackState,
  { cols, frontier, end }: NarrationContext,
): string {
  if (!event) return 'Ready. Press play or step forward to begin.';
  const cell = (id: CellId) => formatCell(cols, id);

  switch (event.type) {
    case 'visit': {
      const dist = formatNumber(state.dist[event.node]);
      if (frontier === 'none') {
        return `Scanning the edges out of ${cell(event.node)}, distance ${dist}.`;
      }
      const side = event.side === undefined ? '' : event.side === 0 ? 'start-side ' : 'goal-side ';
      return `Popped ${cell(event.node)} from the ${side}${STRUCTURE[frontier]} with distance ${dist}.`;
    }
    case 'relax': {
      if (event.from < 0) {
        return `${event.side === 1 ? 'Goal' : 'Start'} ${cell(event.node)} gets distance 0.`;
      }
      const to = formatNumber(event.newDist);
      if (event.newDist < event.oldDist) {
        const was = formatNumber(event.oldDist);
        return `Neighbor ${cell(event.node)} of ${cell(event.from)} improved from ${was} to ${to}.`;
      }
      return `Neighbor ${cell(event.node)} is now reached through ${cell(event.from)}, distance ${to}.`;
    }
    case 'enqueue': {
      const added = `Added ${cell(event.node)} to the ${STRUCTURE[frontier]}`;
      if (event.priority === undefined) return `${added}.`;
      if (event.h === undefined) return `${added} with priority ${formatNumber(event.priority)}.`;
      const h = formatNumber(event.h);
      if (event.priority === event.h) return `${added} with h = ${h}.`;
      const g = formatNumber(state.dist[event.node]);
      return `${added} with f = ${formatNumber(event.priority)} (g ${g} + h ${h}).`;
    }
    case 'skip':
      return `Skipped ${cell(event.node)}: ${event.reason}.`;
    case 'pass':
      return event.n === 1
        ? 'Pass 1: checking every edge.'
        : `Pass ${event.n}: checking every edge again.`;
    case 'found':
      return event.node === end
        ? `Reached the goal at ${cell(event.node)}.`
        : `The two searches met at ${cell(event.node)}.`;
    case 'path': {
      const steps = event.nodes.length - 1;
      return `Path traced: ${steps} ${steps === 1 ? 'step' : 'steps'}.`;
    }
    case 'noPath':
      return 'No path exists between start and end.';
  }
}
