import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import App from '../App';
import { toId } from '../algorithms/grid';
import { frontierItems } from '../engine/playback';
import { useGridStore } from '../store/gridStore';
import { usePlaybackStore } from '../store/playbackStore';
import { useUiStore } from '../store/uiStore';
import { formatCell, formatNumber } from '../utils/format';
import { Sidebar } from './Sidebar';

const COLS = 10;
const play = () => usePlaybackStore.getState();
const grid = () => useGridStore.getState();
const panel = (name: string) => within(screen.getByRole('region', { name }));
const run0 = () => play().runs![0];

/** Selects an algorithm and starts a paused run, so each test decides which step it looks at. */
function start(id: string) {
  act(() => {
    play().setAlgorithm(0, id);
    play().run();
    play().pause();
  });
}

const seek = (index: number) => act(() => play().seek(index));

beforeEach(() => {
  grid().resize(7, COLS);
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

describe('pseudocode', () => {
  const highlighted = () =>
    panel('Pseudocode')
      .getAllByRole('listitem')
      .map((item, i) => (item.getAttribute('aria-current') === 'true' ? i + 1 : 0))
      .filter(Boolean);

  it('lists every line of the selected algorithm', () => {
    render(<Sidebar />);
    start('dijkstra');
    const lines = panel('Pseudocode').getAllByRole('listitem');
    expect(lines).toHaveLength(run0().info.pseudocode.length);
    expect(lines[2]).toHaveTextContent('u ← pq.extractMin()');
  });

  it('highlights no line at step 0', () => {
    render(<Sidebar />);
    start('bfs');
    expect(highlighted()).toEqual([]);
  });

  it.each(['bfs', 'astar', 'bellman-ford'])(
    'highlights the line of the current event at every step of %s',
    (id) => {
      // A small grid keeps a walk over every single step quick.
      grid().resize(5, 7);
      render(<Sidebar />);
      start(id);
      const { events } = run0().playback;
      for (let i = 1; i <= events.length; i++) {
        seek(i);
        expect(highlighted()).toEqual([events[i - 1].line]);
      }
    },
  );

  it('keeps the highlight in step when moving backward', () => {
    render(<Sidebar />);
    start('bfs');
    const { events } = run0().playback;
    seek(events.length);
    for (let i = events.length - 1; i >= 1; i -= 3) {
      seek(i);
      expect(highlighted()).toEqual([events[i - 1].line]);
    }
  });
});

describe('narration', () => {
  it('waits at step 0 and then describes each step', () => {
    render(<Sidebar />);
    start('bfs');
    expect(
      panel('Narration').getByText('Ready. Press play or step forward to begin.'),
    ).toBeInTheDocument();
    seek(3);
    const where = formatCell(COLS, grid().start);
    expect(
      panel('Narration').getByText(`Popped ${where} from the queue with distance 0.`),
    ).toBeInTheDocument();
  });
});

describe('data structure', () => {
  const rows = () => panel('Data structure').queryAllByRole('row').slice(1);

  it('names the structure the algorithm uses', () => {
    render(<Sidebar />);
    start('bfs');
    expect(panel('Data structure').getByRole('heading')).toHaveTextContent('Queue');
    start('dfs');
    expect(panel('Data structure').getByRole('heading')).toHaveTextContent('Stack');
    start('dijkstra');
    expect(panel('Data structure').getByRole('heading')).toHaveTextContent('Priority queue');
  });

  it('lists the frontier in the order it will be taken out', () => {
    render(<Sidebar />);
    start('dijkstra');
    seek(30);
    const expected = frontierItems(run0().playback.state, 'heap').map((item) =>
      formatCell(COLS, item.node),
    );
    expect(rows().map((row) => within(row).getAllByRole('cell')[0].textContent)).toEqual(
      expected.slice(0, 12),
    );
  });

  it('lists at most 12 frontier items and says how many more there are', () => {
    grid().resize(15, 15);
    render(<Sidebar />);
    start('bfs');
    const { playback } = run0();
    let index = 0;
    while (frontierItems(playback.state, 'queue').length <= 12) seek(++index);
    const total = frontierItems(playback.state, 'queue').length;
    expect(rows()).toHaveLength(12);
    expect(panel('Data structure').getByText(`+${total - 12} more`)).toBeInTheDocument();
  });

  it('shows the frontier and visited counts', () => {
    render(<Sidebar />);
    start('bfs');
    seek(40);
    const { state } = run0().playback;
    const data = panel('Data structure');
    expect(data.getByText('In frontier').nextSibling).toHaveTextContent(
      String(frontierItems(state, 'queue').length),
    );
    expect(data.getByText('Visited').nextSibling).toHaveTextContent(String(state.visitedCount));
  });

  it('shows g, h and f columns only for algorithms that use a heuristic', () => {
    render(<Sidebar />);
    start('astar');
    seek(10);
    const headers = () =>
      panel('Data structure')
        .getAllByRole('columnheader')
        .map((th) => th.textContent);
    expect(headers()).toEqual(['Cell', 'g', 'h', 'f']);
    const [first] = frontierItems(run0().playback.state, 'heap');
    const cells = within(rows()[0])
      .getAllByRole('cell')
      .map((td) => td.textContent);
    expect(cells).toEqual([
      formatCell(COLS, first.node),
      formatNumber(first.g),
      formatNumber(first.h),
      formatNumber(first.priority),
    ]);

    start('dijkstra');
    seek(10);
    expect(headers()).toEqual(['Cell', 'Distance']);
  });

  it('shows two queues for bidirectional BFS', () => {
    render(<Sidebar />);
    start('bidirectional');
    seek(4);
    const data = panel('Data structure');
    expect(data.getByRole('table', { name: 'Queue from the start' })).toBeInTheDocument();
    expect(data.getByRole('table', { name: 'Queue from the goal' })).toBeInTheDocument();
    expect(
      within(data.getByRole('table', { name: 'Queue from the goal' })).getByText(
        formatCell(COLS, grid().end),
      ),
    ).toBeInTheDocument();
  });

  it('shows the pass number for Bellman-Ford instead of a queue', () => {
    render(<Sidebar />);
    start('bellman-ford');
    seek(2);
    const data = panel('Data structure');
    expect(data.queryByRole('table')).toBeNull();
    expect(data.getByText('Pass').nextSibling).toHaveTextContent('1');
  });

  it('explains what will appear before there is a run', () => {
    render(<Sidebar />);
    expect(panel('Data structure').getByText(/Run the algorithm/)).toBeInTheDocument();
  });
});

describe('stats', () => {
  const stat = (label: string) => panel('Stats').getByText(label).nextSibling;

  it('counts visited cells and steps as playback moves', () => {
    render(<Sidebar />);
    start('bfs');
    seek(40);
    expect(stat('Nodes visited')).toHaveTextContent(String(run0().playback.state.visitedCount));
    expect(stat('Steps')).toHaveTextContent(`40 / ${play().length}`);
    expect(stat('Compute time')).toHaveTextContent(/ms$/);
  });

  it('shows path length and cost only once playback has reached the path', () => {
    grid().setWeight(toId(COLS, 3, 4), 6);
    render(<Sidebar />);
    start('bfs');
    seek(play().length - 1);
    expect(stat('Path length')).toHaveTextContent('—');
    expect(stat('Path cost')).toHaveTextContent('—');
    seek(play().length);
    expect(stat('Path length')).toHaveTextContent(String(run0().pathLength));
    expect(stat('Path cost')).toHaveTextContent(formatNumber(run0().pathCost!));
  });

  it('says so when the run ends without a path', () => {
    for (let row = 0; row < 7; row++) grid().setWall(toId(COLS, row, 5), true);
    render(<Sidebar />);
    start('bfs');
    seek(play().length);
    expect(stat('Path length')).toHaveTextContent('No path');
  });
});

describe('algorithm card', () => {
  it('describes the selected algorithm before any run', () => {
    render(<Sidebar />);
    const card = panel('Algorithm');
    expect(card.getByRole('heading')).toHaveTextContent('Breadth-First Search');
    expect(card.getByText('Time').nextSibling).toHaveTextContent('O(V + E)');
    expect(card.getByText('Space').nextSibling).toHaveTextContent('O(V)');
    expect(card.getByText('Uses weights').nextSibling).toHaveTextContent('No');
    expect(card.getByText('Shortest path').nextSibling).toHaveTextContent('Yes');
  });

  it('explains on the DFS card why the path is not the shortest', () => {
    render(<Sidebar />);
    act(() => play().setAlgorithm(0, 'dfs'));
    const card = panel('Algorithm');
    expect(card.getByText('Shortest path').nextSibling).toHaveTextContent('No');
    expect(card.getByText(/returns the first route that reaches the goal/)).toBeInTheDocument();
  });

  it('marks A* as conditional on the heuristic', () => {
    render(<Sidebar />);
    act(() => play().setAlgorithm(0, 'astar'));
    expect(panel('Algorithm').getByText('Shortest path').nextSibling).toHaveTextContent('Depends');
  });
});

describe('inspector', () => {
  const field = (label: string) => panel('Inspector').getByText(label).nextSibling;
  const cellEl = (id: number) => document.querySelector<HTMLElement>(`[data-cell="${id}"]`)!;

  it('asks for a cell when nothing is hovered', () => {
    render(<App />);
    expect(panel('Inspector').getByText(/Hover a cell/)).toBeInTheDocument();
  });

  it('shows g, h, f, parent and weight for the hovered cell', () => {
    grid().setWeight(toId(COLS, 3, 3), 4);
    render(<App />);
    start('astar');
    seek(play().length);
    const { state } = run0().playback;
    const target = toId(COLS, 3, 3);
    fireEvent.pointerOver(cellEl(target));

    expect(field('Cell')).toHaveTextContent(formatCell(COLS, target));
    expect(field('Weight')).toHaveTextContent('4');
    expect(field('g (distance)')).toHaveTextContent(formatNumber(state.dist[target]));
    expect(field('h')).toHaveTextContent(formatNumber(state.h[target]));
    expect(field('f')).toHaveTextContent(formatNumber(state.dist[target] + state.h[target]));
    expect(field('Parent')).toHaveTextContent(formatCell(COLS, state.parent[target]));
  });

  it('leaves out h and f for algorithms without a heuristic', () => {
    render(<App />);
    start('bfs');
    seek(play().length);
    fireEvent.pointerOver(cellEl(grid().end));
    expect(field('g (distance)')).toHaveTextContent(String(run0().pathLength));
    expect(panel('Inspector').queryByText('h')).toBeNull();
  });

  it('describes a cell the search has not reached, and a wall', () => {
    grid().setWall(0, true);
    render(<App />);
    start('bfs');
    fireEvent.pointerOver(cellEl(1));
    expect(field('State')).toHaveTextContent('Not reached');
    expect(field('g (distance)')).toHaveTextContent('∞');
    expect(field('Parent')).toHaveTextContent('—');
    fireEvent.pointerOver(cellEl(0));
    expect(field('Weight')).toHaveTextContent('Wall');
  });

  it('clears when the pointer leaves the grid', () => {
    render(<App />);
    fireEvent.pointerOver(cellEl(1));
    expect(useUiStore.getState().inspected).toEqual({ pane: 0, cell: 1 });
    fireEvent.pointerLeave(screen.getByRole('grid'));
    expect(useUiStore.getState().inspected).toBeNull();
  });
});
