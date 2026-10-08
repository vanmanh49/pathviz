import { Pause, Play, SkipBack, SkipForward, StepBack, StepForward } from 'lucide-react';
import { SPEEDS, usePlaybackStore } from '../store/playbackStore';

const speedLabel = (speed: number) => (speed === Infinity ? 'Instant' : `${speed}×`);

export function PlaybackBar() {
  const hasRun = usePlaybackStore((s) => s.runs !== null);
  const index = usePlaybackStore((s) => s.index);
  const length = usePlaybackStore((s) => s.length);
  const playing = usePlaybackStore((s) => s.playing);
  const speed = usePlaybackStore((s) => s.speed);
  const { toggle, pause, seek, step, setSpeed } = usePlaybackStore.getState();

  // Moving by hand always pauses, so the loop does not run away from the chosen step.
  const goTo = (target: number) => {
    pause();
    seek(target);
  };
  const nudge = (delta: number) => {
    pause();
    step(delta);
  };

  return (
    <footer
      className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-line bg-panel px-3 py-2"
      data-tour="playback"
    >
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          className="btn btn-icon"
          aria-label="Jump to start"
          title="Jump to start (Home)"
          disabled={!hasRun}
          onClick={() => goTo(0)}
        >
          <SkipBack size={15} aria-hidden />
        </button>
        <button
          type="button"
          className="btn btn-icon"
          aria-label="Step back"
          title="Step back (←)"
          disabled={!hasRun}
          onClick={() => nudge(-1)}
        >
          <StepBack size={15} aria-hidden />
        </button>
        <button
          type="button"
          className="btn btn-primary btn-icon"
          aria-label={playing ? 'Pause' : 'Play'}
          title={playing ? 'Pause (Space)' : 'Play (Space)'}
          onClick={toggle}
        >
          {playing ? <Pause size={15} aria-hidden /> : <Play size={15} aria-hidden />}
        </button>
        <button
          type="button"
          className="btn btn-icon"
          aria-label="Step forward"
          title="Step forward (→)"
          disabled={!hasRun}
          onClick={() => nudge(1)}
        >
          <StepForward size={15} aria-hidden />
        </button>
        <button
          type="button"
          className="btn btn-icon"
          aria-label="Jump to end"
          title="Jump to end (End)"
          disabled={!hasRun}
          onClick={() => goTo(length)}
        >
          <SkipForward size={15} aria-hidden />
        </button>
      </div>

      <input
        type="range"
        aria-label="Timeline"
        aria-valuetext={`Step ${index} of ${length}`}
        className="min-w-40 flex-1 accent-accent"
        min={0}
        max={length}
        value={index}
        disabled={!hasRun}
        onChange={(e) => goTo(Number(e.target.value))}
      />

      <span className="w-32 text-right text-sm tabular-nums text-muted">
        Step {index} / {length}
      </span>

      <select
        className="field"
        aria-label="Speed"
        value={SPEEDS.indexOf(speed)}
        onChange={(e) => setSpeed(SPEEDS[Number(e.target.value)])}
      >
        {SPEEDS.map((option, i) => (
          <option key={option} value={i}>
            {speedLabel(option)}
          </option>
        ))}
      </select>
    </footer>
  );
}
