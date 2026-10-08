import { useMemo } from 'react';
import type { FrontierKind, Side } from '../algorithms/types';
import type { AlgorithmInfo } from '../data/algorithms';
import { frontierItems, type FrontierItem } from '../engine/playback';
import { useGridStore } from '../store/gridStore';
import type { Run } from '../store/playbackStore';
import { formatCell, formatNumber } from '../utils/format';
import { Facts, Panel } from './Panel';

const TITLES: Record<FrontierKind, string> = {
  queue: 'Queue',
  stack: 'Stack',
  heap: 'Priority queue',
  none: 'Edge passes',
};

const LIMIT = 12;

function FrontierTable({
  name,
  caption,
  items,
  heuristic,
}: {
  name: string;
  caption?: string;
  items: FrontierItem[];
  heuristic: boolean;
}) {
  const cols = useGridStore((s) => s.grid.cols);

  return (
    <div className="mb-2">
      {caption && <p className="mb-1 text-xs text-muted">{caption}</p>}
      <table aria-label={name} className="w-full text-left text-sm tabular-nums">
        <thead className="text-xs text-muted">
          <tr>
            <th scope="col" className="font-normal">
              Cell
            </th>
            {heuristic ? (
              ['g', 'h', 'f'].map((heading) => (
                <th key={heading} scope="col" className="text-right font-normal">
                  {heading}
                </th>
              ))
            ) : (
              <th scope="col" className="text-right font-normal">
                Distance
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {items.slice(0, LIMIT).map((item, i) => (
            <tr key={item.node} className={i === 0 ? 'font-semibold' : undefined}>
              <td>{formatCell(cols, item.node)}</td>
              <td className="text-right">{formatNumber(item.g)}</td>
              {heuristic && (
                <>
                  <td className="text-right">{formatNumber(item.h)}</td>
                  <td className="text-right">{formatNumber(item.g + item.h)}</td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      {items.length === 0 && <p className="text-sm text-muted">Empty</p>}
      {items.length > LIMIT && <p className="text-xs text-muted">+{items.length - LIMIT} more</p>}
    </div>
  );
}

export function DataStructurePanel({ run, info }: { run: Run | null; info: AlgorithmInfo }) {
  const title = TITLES[info.frontier];
  // A search from both ends keeps one queue per side.
  const twoSided = useMemo(
    () => run?.playback.events.some((e) => e.type === 'enqueue' && e.side === 1) ?? false,
    [run],
  );

  if (!run) {
    return (
      <Panel label="Data structure" title={title}>
        <p className="text-sm text-muted">
          {info.frontier === 'none'
            ? 'Run the algorithm to follow its passes over the edges.'
            : `Run the algorithm to watch its ${title.toLowerCase()} fill and drain.`}
        </p>
      </Panel>
    );
  }

  const { state } = run.playback;

  if (info.frontier === 'none') {
    let known = 0;
    for (const dist of state.dist) if (dist !== Infinity) known++;
    return (
      <Panel label="Data structure" title={title}>
        <p className="mb-2 text-sm text-muted">
          No queue here: every pass checks every edge and keeps any shorter distance it finds.
        </p>
        <Facts
          items={[
            ['Pass', state.pass],
            ['Known distances', known],
          ]}
        />
      </Panel>
    );
  }

  const items = (side?: Side) => frontierItems(state, info.frontier, side);
  const all = items();

  return (
    <Panel label="Data structure" title={title}>
      {twoSided ? (
        <>
          <FrontierTable
            name="Queue from the start"
            caption="From the start"
            items={items(0)}
            heuristic={false}
          />
          <FrontierTable
            name="Queue from the goal"
            caption="From the goal"
            items={items(1)}
            heuristic={false}
          />
        </>
      ) : (
        <FrontierTable name={title} items={all} heuristic={info.usesHeuristic} />
      )}
      <Facts
        items={[
          ['In frontier', all.length],
          ['Visited', state.visitedCount],
        ]}
      />
    </Panel>
  );
}
