import {
  BrickWall,
  CircleHelp,
  Columns2,
  Eraser,
  Moon,
  MoveDiagonal,
  Play,
  RotateCcw,
  Sun,
  TriangleAlert,
  Waypoints,
  Weight,
  type LucideIcon,
} from 'lucide-react';
import { isAdmissible } from '../algorithms/heuristics';
import type { HeuristicId } from '../algorithms/types';
import { ALGORITHMS, getAlgorithm } from '../data/algorithms';
import { GENERATORS } from '../generators';
import { COL_LIMITS, ROW_LIMITS, useGridStore } from '../store/gridStore';
import { usePlaybackStore } from '../store/playbackStore';
import { useUiStore, type Pane, type Tool } from '../store/uiStore';

const TOOLS: { id: Tool; label: string; text: string; icon: LucideIcon }[] = [
  { id: 'wall', label: 'Wall tool', text: 'Wall', icon: BrickWall },
  { id: 'erase', label: 'Erase tool', text: 'Erase', icon: Eraser },
  { id: 'weight', label: 'Weight tool', text: 'Weight', icon: Weight },
];

const WEIGHTS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

function EditToolbar() {
  const tool = useUiStore((s) => s.tool);
  const brush = useUiStore((s) => s.brush);
  const setTool = useUiStore((s) => s.setTool);
  const setBrush = useUiStore((s) => s.setBrush);
  const rows = useGridStore((s) => s.grid.rows);
  const cols = useGridStore((s) => s.grid.cols);
  const diagonal = useGridStore((s) => s.diagonal);
  const grid = useGridStore.getState();
  const hasRun = usePlaybackStore((s) => s.runs !== null);
  const clearRun = usePlaybackStore((s) => s.clearRun);

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line px-3 py-2">
      <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Edit tool">
        {TOOLS.map(({ id, label, text, icon: Icon }) => (
          <button
            key={id}
            type="button"
            className="btn"
            aria-label={label}
            aria-pressed={tool === id}
            onClick={() => setTool(id)}
          >
            <Icon size={15} aria-hidden />
            {text}
          </button>
        ))}
        <select
          className="field"
          aria-label="Weight value"
          value={brush}
          onChange={(e) => setBrush(Number(e.target.value))}
        >
          {WEIGHTS.map((w) => (
            <option key={w} value={w}>
              {w}
            </option>
          ))}
        </select>
        <span className="hidden text-xs text-muted xl:inline">
          Shift erases · hold W for weights
        </span>
      </div>

      <button
        type="button"
        className="btn"
        aria-label="Diagonal movement"
        aria-pressed={diagonal}
        onClick={() => grid.setDiagonal(!diagonal)}
      >
        <MoveDiagonal size={15} aria-hidden />
        Diagonals
      </button>

      <div className="flex flex-wrap items-center gap-1.5">
        <button type="button" className="btn" disabled={!hasRun} onClick={clearRun}>
          Clear path
        </button>
        <button type="button" className="btn" onClick={grid.clearWalls}>
          Clear walls
        </button>
        <button type="button" className="btn" onClick={grid.clearWeights}>
          Clear weights
        </button>
        <button type="button" className="btn" onClick={grid.resetAll}>
          <RotateCcw size={15} aria-hidden />
          Reset all
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-sm text-muted">
        <label className="flex items-center gap-1.5">
          Rows
          <input
            type="range"
            aria-label="Rows"
            className="w-20 accent-accent"
            min={ROW_LIMITS.min}
            max={ROW_LIMITS.max}
            value={rows}
            onChange={(e) => grid.resize(Number(e.target.value), cols)}
          />
          <output className="w-5 tabular-nums text-ink">{rows}</output>
        </label>
        <label className="flex items-center gap-1.5">
          Columns
          <input
            type="range"
            aria-label="Columns"
            className="w-20 accent-accent"
            min={COL_LIMITS.min}
            max={COL_LIMITS.max}
            value={cols}
            onChange={(e) => grid.resize(rows, Number(e.target.value))}
          />
          <output className="w-5 tabular-nums text-ink">{cols}</output>
        </label>
      </div>
    </div>
  );
}

const HEURISTICS: { id: HeuristicId; name: string }[] = [
  { id: 'manhattan', name: 'Manhattan' },
  { id: 'euclidean', name: 'Euclidean' },
  { id: 'octile', name: 'Octile' },
  { id: 'chebyshev', name: 'Chebyshev' },
];

function AlgorithmPicker({ pane, label }: { pane: Pane; label: string }) {
  const { algorithmId, heuristic } = usePlaybackStore((s) => s.panes[pane]);
  const diagonal = useGridStore((s) => s.diagonal);
  const { setAlgorithm, setHeuristic } = usePlaybackStore.getState();
  const info = getAlgorithm(algorithmId);
  // Only A* promises a shortest path on condition of the heuristic, so only it gets the warning.
  const overestimates = info.optimal === 'conditional' && !isAdmissible(heuristic, diagonal);

  return (
    <>
      <select
        className="field"
        aria-label={label}
        value={algorithmId}
        onChange={(e) => setAlgorithm(pane, e.target.value)}
      >
        {ALGORITHMS.map(({ id, name }) => (
          <option key={id} value={id}>
            {name}
          </option>
        ))}
      </select>
      {info.usesHeuristic && (
        <select
          className="field"
          aria-label={label.replace('Algorithm', 'Heuristic')}
          value={heuristic}
          onChange={(e) => setHeuristic(pane, e.target.value as HeuristicId)}
        >
          {HEURISTICS.map(({ id, name }) => (
            <option key={id} value={id}>
              {name}
            </option>
          ))}
        </select>
      )}
      {overestimates && (
        <span className="flex items-center gap-1 text-xs text-muted" role="note">
          <TriangleAlert size={14} className="text-[var(--end)]" aria-hidden />
          Manhattan overestimates with diagonal moves, so the path may not be the shortest.
        </span>
      )}
    </>
  );
}

function GenerateMenu() {
  const generating = useGridStore((s) => s.generating);

  // The menu is a list of actions, so it always snaps back to its placeholder.
  return (
    <select
      className="field"
      aria-label="Generate"
      value=""
      disabled={generating}
      onChange={(e) => {
        const instant = usePlaybackStore.getState().speed === Infinity;
        useGridStore.getState().generate(e.target.value, undefined, instant);
      }}
    >
      <option value="" disabled>
        {generating ? 'Generating…' : 'Generate…'}
      </option>
      {GENERATORS.map(({ id, name }) => (
        <option key={id} value={id}>
          {name}
        </option>
      ))}
    </select>
  );
}

export function TopBar() {
  const run = usePlaybackStore((s) => s.run);
  const compare = usePlaybackStore((s) => s.compare);
  const setCompare = usePlaybackStore((s) => s.setCompare);
  const generating = useGridStore((s) => s.generating);
  const theme = useUiStore((s) => s.theme);
  const { setTheme, setTourSeen } = useUiStore.getState();
  const otherTheme = theme === 'dark' ? 'light' : 'dark';

  return (
    <header className="border-b border-line bg-panel">
      <div className="flex flex-wrap items-center gap-2 px-3 py-2">
        <h1 className="mr-2 flex items-center gap-2 text-base font-semibold">
          <Waypoints size={18} className="text-accent" aria-hidden />
          PathViz
        </h1>
        <div className="flex flex-wrap items-center gap-2" data-tour="algorithm">
          <AlgorithmPicker pane={0} label={compare ? 'Algorithm A' : 'Algorithm'} />
          {compare && <AlgorithmPicker pane={1} label="Algorithm B" />}
        </div>
        <button type="button" className="btn btn-primary" disabled={generating} onClick={run}>
          <Play size={15} aria-hidden />
          Run
        </button>
        <GenerateMenu />
        <button
          type="button"
          className="btn"
          aria-label="Compare mode"
          aria-pressed={compare}
          onClick={() => setCompare(!compare)}
        >
          <Columns2 size={15} aria-hidden />
          Compare
        </button>
        <div className="ml-auto flex items-center gap-1.5">
          <button
            type="button"
            className="btn btn-icon"
            aria-label="Show tour"
            title="Show tour"
            onClick={() => setTourSeen(false)}
          >
            <CircleHelp size={16} aria-hidden />
          </button>
          <button
            type="button"
            className="btn btn-icon"
            aria-label={`Switch to ${otherTheme} theme`}
            title={`Switch to ${otherTheme} theme`}
            onClick={() => setTheme(otherTheme)}
          >
            {theme === 'dark' ? <Sun size={16} aria-hidden /> : <Moon size={16} aria-hidden />}
          </button>
        </div>
      </div>
      <EditToolbar />
    </header>
  );
}
