import type { ReactNode } from 'react';
import { usePlaybackStore, type Run } from '../store/playbackStore';
import { formatNumber } from '../utils/format';

const ROWS: [label: string, value: (run: Run) => ReactNode][] = [
  ['Nodes visited', (run) => run.playback.state.visitedCount],
  ['Path length', (run) => run.pathLength ?? 'No path'],
  ['Path cost', (run) => (run.pathCost === null ? '—' : formatNumber(run.pathCost))],
  ['Shortest path', (run) => (run.optimal === null ? '—' : run.optimal ? 'Yes' : 'No')],
  ['Steps', (run) => run.playback.length],
  ['Compute time', (run) => `${run.computeMs.toFixed(2)} ms`],
];

/** Side-by-side results, shown once both runs in compare mode have played to the end. */
export function CompareSummary() {
  const runs = usePlaybackStore((s) => s.runs);
  const finished = usePlaybackStore((s) => s.runs !== null && s.index === s.length);
  if (!runs || runs.length < 2 || !finished) return null;

  return (
    <section aria-label="Comparison summary" className="panel shrink-0 overflow-x-auto p-3">
      <table aria-label="Comparison" className="w-full text-left text-sm tabular-nums">
        <thead>
          <tr className="text-xs text-muted">
            <th scope="col" />
            {runs.map((run, i) => (
              <th key={i} scope="col" className="pb-1 font-medium">
                {i === 0 ? 'A' : 'B'} · {run.info.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ROWS.map(([label, value]) => (
            <tr key={label} className="border-t border-line">
              <th scope="row" className="py-1 pr-3 font-normal text-muted">
                {label}
              </th>
              {runs.map((run, i) => (
                <td key={i} className="py-1 font-medium">
                  {value(run)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
