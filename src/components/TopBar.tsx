import {
  BrickWall,
  Eraser,
  MoveDiagonal,
  Play,
  RotateCcw,
  Waypoints,
  Weight,
  type LucideIcon,
} from 'lucide-react';
import { ALGORITHMS } from '../data/algorithms';
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
      <div className="flex items-center gap-1.5" role="group" aria-label="Edit tool">
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

      <div className="flex items-center gap-1.5">
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

      <div className="flex items-center gap-3 text-sm text-muted">
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

function AlgorithmPicker({ pane, label }: { pane: Pane; label: string }) {
  const algorithmId = usePlaybackStore((s) => s.panes[pane].algorithmId);
  const setAlgorithm = usePlaybackStore((s) => s.setAlgorithm);

  return (
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
  );
}

export function TopBar() {
  const run = usePlaybackStore((s) => s.run);

  return (
    <header className="border-b border-line bg-panel">
      <div className="flex flex-wrap items-center gap-2 px-3 py-2">
        <h1 className="mr-2 flex items-center gap-2 text-base font-semibold">
          <Waypoints size={18} className="text-accent" aria-hidden />
          PathViz
        </h1>
        <div className="flex items-center gap-2" data-tour="algorithm">
          <AlgorithmPicker pane={0} label="Algorithm" />
        </div>
        <button type="button" className="btn btn-primary" onClick={run}>
          <Play size={15} aria-hidden />
          Run
        </button>
      </div>
      <EditToolbar />
    </header>
  );
}
