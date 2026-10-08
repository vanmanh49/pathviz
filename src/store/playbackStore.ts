import { create } from 'zustand';
import { dijkstra } from '../algorithms/dijkstra';
import { pathCost } from '../algorithms/grid';
import type { Grid, HeuristicId, StepEvent } from '../algorithms/types';
import { getAlgorithm, type AlgorithmInfo } from '../data/algorithms';
import { Playback } from '../engine/playback';
import { useGridStore } from './gridStore';
import type { Pane } from './uiStore';

/** Playback speed multipliers; Infinity is "instant". */
export const SPEEDS = [0.25, 0.5, 1, 2, 5, 10, Infinity];
export const BASE_EVENTS_PER_SECOND = 60;

export interface PaneConfig {
  algorithmId: string;
  heuristic: HeuristicId;
}

export interface Run {
  info: AlgorithmInfo;
  playback: Playback;
  computeMs: number;
  pathLength: number | null;
  pathCost: number | null;
  /** Whether the path costs the same as the cheapest possible one; null when there is no path. */
  optimal: boolean | null;
}

interface PlaybackStore {
  compare: boolean;
  panes: [PaneConfig, PaneConfig];
  runs: Run[] | null;
  /** Number of events applied. Shared by every run; a shorter run stops at its own end. */
  index: number;
  length: number;
  playing: boolean;
  speed: number;
  setAlgorithm(pane: Pane, id: string): void;
  setHeuristic(pane: Pane, heuristic: HeuristicId): void;
  setCompare(on: boolean): void;
  setSpeed(speed: number): void;
  run(): void;
  clearRun(): void;
  play(): void;
  pause(): void;
  toggle(): void;
  seek(index: number): void;
  step(delta: number): void;
}

const NO_RUN = { runs: null, index: 0, length: 0, playing: false };

function costOfPath(grid: Grid, events: StepEvent[]): { steps: number; cost: number } | null {
  const last = events[events.length - 1];
  if (last?.type !== 'path') return null;
  return { steps: last.nodes.length - 1, cost: pathCost(grid, last.nodes) };
}

export const usePlaybackStore = create<PlaybackStore>((set, get) => {
  const setPane = (pane: Pane, change: Partial<PaneConfig>) => {
    const panes: [PaneConfig, PaneConfig] = [...get().panes];
    panes[pane] = { ...panes[pane], ...change };
    set({ panes, ...NO_RUN });
  };

  return {
    compare: false,
    panes: [
      { algorithmId: 'bfs', heuristic: 'manhattan' },
      { algorithmId: 'dijkstra', heuristic: 'manhattan' },
    ],
    speed: 1,
    ...NO_RUN,

    setAlgorithm: (pane, algorithmId) => setPane(pane, { algorithmId }),
    setHeuristic: (pane, heuristic) => setPane(pane, { heuristic }),
    setCompare: (compare) => set({ compare, ...NO_RUN }),

    setSpeed: (speed) => {
      set({ speed });
      if (speed === Infinity && get().playing) get().seek(get().length);
    },

    run: () => {
      const { grid, start, end, diagonal, generating } = useGridStore.getState();
      // A half-drawn maze is not a grid worth searching.
      if (generating) return;
      const { compare, panes, speed } = get();
      const cellCount = grid.rows * grid.cols;
      // Dijkstra's result is the yardstick every run's path cost is measured against.
      const best = costOfPath(
        grid,
        dijkstra(grid, start, end, { diagonal, heuristic: 'manhattan' }),
      );

      const runs = (compare ? panes : panes.slice(0, 1)).map(({ algorithmId, heuristic }): Run => {
        const info = getAlgorithm(algorithmId);
        const startedAt = performance.now();
        const events = info.run(grid, start, end, { diagonal, heuristic });
        const computeMs = performance.now() - startedAt;
        const result = costOfPath(grid, events);
        return {
          info,
          playback: new Playback(cellCount, events),
          computeMs,
          pathLength: result?.steps ?? null,
          pathCost: result?.cost ?? null,
          optimal: result && best ? Math.abs(result.cost - best.cost) < 1e-9 : null,
        };
      });

      const length = Math.max(...runs.map((run) => run.playback.length));
      set({ runs, length, index: 0, playing: true });
      if (speed === Infinity) get().seek(length);
    },

    clearRun: () => {
      if (get().runs) set(NO_RUN);
    },

    play: () => {
      const { runs, index, length } = get();
      if (!runs) return get().run();
      if (index === length) get().seek(0);
      set({ playing: true });
    },

    pause: () => set({ playing: false }),

    toggle: () => (get().playing ? get().pause() : get().play()),

    seek: (index) => {
      const { runs, length } = get();
      if (!runs) return;
      const target = Math.min(length, Math.max(0, Math.round(index)));
      for (const run of runs) run.playback.seek(target);
      set(target === length ? { index: target, playing: false } : { index: target });
    },

    step: (delta) => get().seek(get().index + delta),
  };
});

// A run describes one exact grid, so any change to the grid makes it stale.
useGridStore.subscribe((state, previous) => {
  if (
    state.grid !== previous.grid ||
    state.start !== previous.start ||
    state.end !== previous.end ||
    state.diagonal !== previous.diagonal
  ) {
    usePlaybackStore.getState().clearRun();
  }
});
