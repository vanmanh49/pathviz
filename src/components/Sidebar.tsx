import { getAlgorithm } from '../data/algorithms';
import { usePlaybackStore } from '../store/playbackStore';
import { useUiStore, type Pane } from '../store/uiStore';
import { AlgorithmCard } from './AlgorithmCard';
import { CompareSummary } from './CompareSummary';
import { DataStructurePanel } from './DataStructurePanel';
import { Inspector } from './Inspector';
import { Legend } from './Legend';
import { Narration } from './Narration';
import { PseudocodePanel } from './PseudocodePanel';
import { StatsPanel } from './StatsPanel';

export function Sidebar() {
  const compare = usePlaybackStore((s) => s.compare);
  const sidebarPane = useUiStore((s) => s.sidebarPane);
  const pane: Pane = compare ? sidebarPane : 0;
  const algorithmId = usePlaybackStore((s) => s.panes[pane].algorithmId);
  const run = usePlaybackStore((s) => s.runs?.[pane] ?? null);
  // A run's playback state changes in place; the step index is what triggers a re-render.
  usePlaybackStore((s) => s.index);
  const info = run?.info ?? getAlgorithm(algorithmId);
  const names = usePlaybackStore((s) => s.panes).map((p) => getAlgorithm(p.algorithmId).name);
  const { setSidebarPane } = useUiStore.getState();

  return (
    <aside
      aria-label="Explanation"
      data-tour="sidebar"
      className="flex w-full shrink-0 flex-col gap-3 border-t border-line p-3 lg:w-[24rem] lg:overflow-y-auto lg:border-t-0 lg:border-l"
    >
      <CompareSummary />
      {compare && (
        <div role="group" aria-label="Algorithm shown" className="flex gap-1.5">
          {([0, 1] as const).map((side) => (
            <button
              key={side}
              type="button"
              className="btn min-w-0 flex-1 justify-center"
              aria-label={`Show algorithm ${side === 0 ? 'A' : 'B'}`}
              aria-pressed={pane === side}
              title={names[side]}
              onClick={() => setSidebarPane(side)}
            >
              <span className="truncate">
                {side === 0 ? 'A' : 'B'} · {names[side]}
              </span>
            </button>
          ))}
        </div>
      )}
      <AlgorithmCard info={info} />
      <Narration run={run} info={info} />
      <PseudocodePanel info={info} line={run?.playback.current?.line ?? 0} />
      <DataStructurePanel run={run} info={info} />
      <Inspector />
      <StatsPanel run={run} />
      <Legend />
    </aside>
  );
}
