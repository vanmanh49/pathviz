import { Grid } from './components/Grid';
import { PlaybackBar } from './components/PlaybackBar';
import { TopBar } from './components/TopBar';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { usePlaybackLoop } from './hooks/usePlaybackLoop';

export default function App() {
  usePlaybackLoop();
  useKeyboardShortcuts();

  return (
    <div className="flex h-dvh flex-col">
      <TopBar />
      <main className="flex min-h-0 flex-1 p-3">
        <Grid pane={0} />
      </main>
      <PlaybackBar />
    </div>
  );
}
