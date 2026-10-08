import { Grid } from './components/Grid';
import { PlaybackBar } from './components/PlaybackBar';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { usePlaybackLoop } from './hooks/usePlaybackLoop';
import { useGridStore } from './store/gridStore';
import { usePlaybackStore } from './store/playbackStore';

export default function App() {
  usePlaybackLoop();
  useKeyboardShortcuts();
  const compare = usePlaybackStore((s) => s.compare);
  // Two wide grids get bigger cells stacked; two tall ones do better side by side.
  const stacked = useGridStore((s) => s.grid.cols > s.grid.rows * 1.2);

  return (
    <div className="flex h-dvh flex-col">
      <TopBar />
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto lg:flex-row lg:overflow-hidden">
        <main
          className={`flex min-w-0 shrink-0 flex-col gap-3 p-3 lg:h-auto lg:flex-1 ${compare ? 'h-[95dvh]' : 'h-[55dvh]'}`}
        >
          <div className={`flex min-h-0 flex-1 gap-3 ${compare && stacked ? 'flex-col' : ''}`}>
            <Grid pane={0} />
            {compare && <Grid pane={1} />}
          </div>
        </main>
        <Sidebar />
      </div>
      <PlaybackBar />
    </div>
  );
}
