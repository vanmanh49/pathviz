import type { Run } from '../store/playbackStore';
import { formatNumber } from '../utils/format';
import { Facts, Panel } from './Panel';

export function StatsPanel({ run }: { run: Run | null }) {
  const state = run?.playback.state;
  // Path figures appear when playback reaches the path, not before.
  const traced = Boolean(state?.path);
  const pending = state?.result === 'noPath' ? 'No path' : '—';

  return (
    <Panel label="Stats" title="Stats">
      <Facts
        items={[
          ['Nodes visited', state ? state.visitedCount : '—'],
          ['Path length', traced && run ? run.pathLength : pending],
          ['Path cost', traced && run?.pathCost != null ? formatNumber(run.pathCost) : pending],
          ['Steps', run ? `${run.playback.index} / ${run.playback.length}` : '—'],
          ['Compute time', run ? `${run.computeMs.toFixed(2)} ms` : '—'],
        ]}
      />
    </Panel>
  );
}
