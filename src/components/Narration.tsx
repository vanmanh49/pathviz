import type { AlgorithmInfo } from '../data/algorithms';
import { narrate } from '../engine/narrate';
import { createState } from '../engine/playback';
import { useGridStore } from '../store/gridStore';
import { usePlaybackStore, type Run } from '../store/playbackStore';
import { Panel } from './Panel';

const IDLE = createState(0);

export function Narration({ run, info }: { run: Run | null; info: AlgorithmInfo }) {
  const cols = useGridStore((s) => s.grid.cols);
  const end = useGridStore((s) => s.end);
  const playing = usePlaybackStore((s) => s.playing);
  const text = narrate(run?.playback.current, run?.playback.state ?? IDLE, {
    cols,
    frontier: info.frontier,
    end,
  });

  return (
    <Panel label="Narration" title="Current step">
      {/* Each step taken by hand is read out; playback stays quiet while steps fly past. */}
      <p aria-live={playing ? 'off' : 'polite'} className="min-h-10 text-sm">
        {text}
      </p>
    </Panel>
  );
}
