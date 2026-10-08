import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import App from '../App';
import { useGridStore } from '../store/gridStore';
import { usePlaybackStore } from '../store/playbackStore';
import { useUiStore } from '../store/uiStore';

const play = () => usePlaybackStore.getState();
const grid = () => useGridStore.getState();
const button = (name: string) => screen.getByRole('button', { name });
const board = (letter: 'A' | 'B') =>
  screen.getByRole('grid', { name: `Pathfinding grid ${letter}` });
const pathCells = (letter: 'A' | 'B') =>
  board(letter).querySelectorAll('[data-state="path"]').length;
const seek = (index: number) => act(() => play().seek(index));

/** Renders the app in compare mode with a paused run of the two given algorithms. */
function compare(a: string, b: string) {
  render(<App />);
  fireEvent.click(button('Compare mode'));
  act(() => {
    play().setAlgorithm(0, a);
    play().setAlgorithm(1, b);
  });
  fireEvent.click(button('Run'));
  act(() => play().pause());
  const [first, second] = play().runs!;
  const firstIsShorter = first.playback.length < second.playback.length;
  return {
    shorter: firstIsShorter ? first : second,
    longer: firstIsShorter ? second : first,
    shorterPane: (firstIsShorter ? 'A' : 'B') as 'A' | 'B',
    longerPane: (firstIsShorter ? 'B' : 'A') as 'A' | 'B',
  };
}

beforeEach(() => {
  grid().resize(8, 12);
  grid().setDiagonal(false);
  usePlaybackStore.setState({
    compare: false,
    speed: 1,
    panes: [
      { algorithmId: 'bfs', heuristic: 'manhattan' },
      { algorithmId: 'dijkstra', heuristic: 'manhattan' },
    ],
  });
  play().clearRun();
  useUiStore.setState({ inspected: null, sidebarPane: 0 });
});

describe('layout', () => {
  it('shows a second grid and a second algorithm select in compare mode', () => {
    render(<App />);
    expect(screen.getAllByRole('grid')).toHaveLength(1);
    fireEvent.click(button('Compare mode'));
    expect(screen.getAllByRole('grid')).toHaveLength(2);
    expect(screen.getByRole('combobox', { name: 'Algorithm A' })).toHaveValue('bfs');
    expect(screen.getByRole('combobox', { name: 'Algorithm B' })).toHaveValue('dijkstra');
    expect(screen.queryByRole('combobox', { name: 'Algorithm' })).toBeNull();
    expect(button('Compare mode')).toHaveAttribute('aria-pressed', 'true');
  });

  it('heads each grid with its algorithm', () => {
    render(<App />);
    fireEvent.click(button('Compare mode'));
    expect(screen.getByRole('heading', { name: 'A · Breadth-First Search' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: "B · Dijkstra's Algorithm" })).toBeInTheDocument();
  });

  it('goes back to one grid when compare mode is turned off', () => {
    render(<App />);
    fireEvent.click(button('Compare mode'));
    fireEvent.click(button('Compare mode'));
    expect(screen.getAllByRole('grid')).toHaveLength(1);
    expect(screen.getByRole('combobox', { name: 'Algorithm' })).toBeInTheDocument();
  });

  it('offers a heuristic for each side that uses one', () => {
    render(<App />);
    fireEvent.click(button('Compare mode'));
    fireEvent.change(screen.getByRole('combobox', { name: 'Algorithm B' }), {
      target: { value: 'astar' },
    });
    fireEvent.change(screen.getByRole('combobox', { name: 'Heuristic B' }), {
      target: { value: 'euclidean' },
    });
    expect(play().panes[1]).toEqual({ algorithmId: 'astar', heuristic: 'euclidean' });
    expect(screen.queryByRole('combobox', { name: 'Heuristic A' })).toBeNull();
  });
});

describe('shared grid', () => {
  it('edits made in one pane appear in the other', () => {
    render(<App />);
    fireEvent.click(button('Compare mode'));
    fireEvent.pointerDown(board('A').querySelector('[data-cell="0"]')!);
    fireEvent.pointerUp(window);
    expect(board('B').querySelector('[data-cell="0"]')).toHaveAttribute('data-kind', 'wall');
  });

  it('hovering a cell in the second pane inspects that pane', () => {
    render(<App />);
    fireEvent.click(button('Compare mode'));
    fireEvent.pointerOver(board('B').querySelector('[data-cell="5"]')!);
    expect(useUiStore.getState().inspected).toEqual({ pane: 1, cell: 5 });
  });
});

describe('synchronised playback', () => {
  it('runs both algorithms on the same grid from one Run press', () => {
    compare('bfs', 'dfs');
    expect(play().runs!.map((run) => run.info.id)).toEqual(['bfs', 'dfs']);
    expect(play().length).toBe(Math.max(...play().runs!.map((run) => run.playback.length)));
  });

  it('paints each pane from its own run', () => {
    compare('bfs', 'dfs');
    seek(play().length);
    const [a, b] = play().runs!;
    expect(a.pathLength).not.toBe(b.pathLength);
    expect(pathCells('A')).toBe(a.pathLength! + 1);
    expect(pathCells('B')).toBe(b.pathLength! + 1);
  });

  it('keeps the shorter run on its final state while the longer continues', () => {
    const { shorter, longer, shorterPane, longerPane } = compare('bfs', 'astar');
    const past = shorter.playback.length + 5;
    expect(past).toBeLessThan(longer.playback.length);
    seek(past);
    expect(shorter.playback.index).toBe(shorter.playback.length);
    expect(shorter.playback.state.result).toBe('found');
    expect(longer.playback.index).toBe(past);
    expect(pathCells(shorterPane)).toBe(shorter.pathLength! + 1);
    expect(pathCells(longerPane)).toBe(0);
    expect(play().index).toBe(past);
  });

  it('keeps playing until the longer run is done', () => {
    const { shorter } = compare('bfs', 'astar');
    act(() => {
      play().play();
      play().step(shorter.playback.length);
    });
    expect(play().playing).toBe(true);
    act(() => play().step(play().length));
    expect(play().playing).toBe(false);
  });

  it('scrubbing back before the shorter run ended un-finishes it', () => {
    const { shorter, shorterPane } = compare('bfs', 'astar');
    seek(play().length);
    seek(shorter.playback.length - 3);
    expect(shorter.playback.index).toBe(shorter.playback.length - 3);
    expect(shorter.playback.state.path).toBeNull();
    expect(pathCells(shorterPane)).toBe(0);
  });
});

describe('summary', () => {
  const summary = () => screen.queryByRole('table', { name: 'Comparison' });
  const row = (name: string) =>
    within(within(summary()!).getByRole('row', { name: new RegExp(`^${name}`) }))
      .getAllByRole('cell')
      .map((cell) => cell.textContent);

  it('shows the summary table only at the last step', () => {
    compare('bfs', 'dfs');
    expect(summary()).toBeNull();
    seek(play().length - 1);
    expect(summary()).toBeNull();
    seek(play().length);
    expect(summary()).toBeInTheDocument();
    seek(play().length - 1);
    expect(summary()).toBeNull();
  });

  it('reports DFS as not optimal and Dijkstra as optimal on a grid where they differ', () => {
    compare('dfs', 'dijkstra');
    seek(play().length);
    expect(row('Shortest path')).toEqual(['No', 'Yes']);
  });

  it('lists visited cells, path length, path cost, steps and compute time for both', () => {
    compare('dfs', 'dijkstra');
    seek(play().length);
    const [a, b] = play().runs!;
    expect(
      within(summary()!)
        .getAllByRole('columnheader')
        .map((th) => th.textContent),
    ).toEqual(['', 'A · Depth-First Search', "B · Dijkstra's Algorithm"]);
    expect(row('Nodes visited')).toEqual(
      [a, b].map((run) => String(run.playback.state.visitedCount)),
    );
    expect(row('Path length')).toEqual([String(a.pathLength), String(b.pathLength)]);
    expect(row('Path cost')).toEqual([String(a.pathCost), String(b.pathCost)]);
    expect(row('Steps')).toEqual([String(a.playback.length), String(b.playback.length)]);
    expect(row('Compute time')[0]).toMatch(/ms$/);
  });

  it('says so when neither algorithm finds a path', () => {
    for (let r = 0; r < 8; r++) grid().setWall(r * 12 + 5, true);
    compare('bfs', 'dijkstra');
    seek(play().length);
    expect(row('Path length')).toEqual(['No path', 'No path']);
    expect(row('Shortest path')).toEqual(['—', '—']);
  });

  it('is not shown outside compare mode', () => {
    render(<App />);
    fireEvent.click(button('Run'));
    seek(play().length);
    expect(summary()).toBeNull();
  });
});

describe('sidebar', () => {
  const firstLine = () =>
    within(screen.getByRole('region', { name: 'Pseudocode' })).getAllByRole('listitem')[0];

  it('switching the sidebar between A and B swaps the pseudocode', () => {
    render(<App />);
    fireEvent.click(button('Compare mode'));
    expect(firstLine()).toHaveTextContent('queue ← [start]');
    fireEvent.click(button('Show algorithm B'));
    expect(firstLine()).toHaveTextContent('dist[start] ← 0; pq ← {start}');
    expect(button('Show algorithm B')).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(button('Show algorithm A'));
    expect(firstLine()).toHaveTextContent('queue ← [start]');
  });

  it('has no A/B switch outside compare mode', () => {
    render(<App />);
    expect(screen.queryByRole('button', { name: 'Show algorithm B' })).toBeNull();
  });

  it('shows the first algorithm again after compare mode is turned off', () => {
    render(<App />);
    fireEvent.click(button('Compare mode'));
    fireEvent.click(button('Show algorithm B'));
    fireEvent.click(button('Compare mode'));
    expect(firstLine()).toHaveTextContent('queue ← [start]');
  });
});

describe('invalidation', () => {
  it('turning compare mode off discards the run', () => {
    compare('bfs', 'dfs');
    seek(10);
    fireEvent.click(button('Compare mode'));
    expect(play()).toMatchObject({ runs: null, index: 0, length: 0, playing: false });
    expect(document.querySelectorAll('[data-cell][data-state]')).toHaveLength(0);
  });

  it('turning compare mode on discards a single run', () => {
    render(<App />);
    fireEvent.click(button('Run'));
    fireEvent.click(button('Compare mode'));
    expect(play().runs).toBeNull();
  });
});
