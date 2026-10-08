import { Grid } from './components/Grid';
import { TopBar } from './components/TopBar';

export default function App() {
  return (
    <div className="flex h-dvh flex-col">
      <TopBar />
      <main className="flex min-h-0 flex-1 p-3">
        <Grid pane={0} />
      </main>
    </div>
  );
}
