import { Grid } from './components/Grid';
import { PlaybackBar } from './components/PlaybackBar';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { usePlaybackLoop } from './hooks/usePlaybackLoop';

export default function App() {
  usePlaybackLoop();
  useKeyboardShortcuts();

  return (
    <div className="flex h-dvh flex-col">
      <TopBar />
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto lg:flex-row lg:overflow-hidden">
        <main className="flex h-[55dvh] min-w-0 shrink-0 p-3 lg:h-auto lg:flex-1">
          <Grid pane={0} />
        </main>
        <Sidebar />
      </div>
      <PlaybackBar />
    </div>
  );
}
