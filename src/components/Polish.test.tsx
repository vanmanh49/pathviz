import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import App from '../App';
import { toId } from '../algorithms/grid';
import { useGridStore } from '../store/gridStore';
import { usePlaybackStore } from '../store/playbackStore';
import { useUiStore } from '../store/uiStore';

const COLS = 12;
const play = () => usePlaybackStore.getState();
const grid = () => useGridStore.getState();
const button = (name: string) => screen.getByRole('button', { name });
const cell = (id: number) => document.querySelector<HTMLElement>(`[data-cell="${id}"]`)!;
const press = (key: string) => fireEvent.keyDown(document.activeElement!, { key });

beforeEach(() => {
  grid().resize(8, COLS);
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
  useUiStore.setState({ theme: 'dark', tourSeen: true, inspected: null, sidebarPane: 0 });
});

describe('theme', () => {
  it('toggles the dark class on <html> and remembers the choice', () => {
    render(<App />);
    expect(document.documentElement).toHaveClass('dark');
    fireEvent.click(button('Switch to light theme'));
    expect(document.documentElement).not.toHaveClass('dark');
    const saved = JSON.parse(localStorage.getItem('pathviz-ui')!) as { state: { theme: string } };
    expect(saved.state.theme).toBe('light');
    fireEvent.click(button('Switch to dark theme'));
    expect(document.documentElement).toHaveClass('dark');
  });

  it('starts in the saved theme', () => {
    useUiStore.setState({ theme: 'light' });
    render(<App />);
    expect(document.documentElement).not.toHaveClass('dark');
  });
});

describe('legend', () => {
  it('lists all nine colour roles', () => {
    render(<App />);
    const legend = within(screen.getByRole('region', { name: 'Legend' }));
    const roles = [
      'Empty',
      'Wall',
      'Weight',
      'Start',
      'End',
      'Frontier',
      'Visited',
      'Current',
      'Path',
    ];
    expect(legend.getAllByRole('listitem').map((item) => item.textContent)).toEqual(roles);
  });
});

describe('tour', () => {
  const tour = () => screen.queryByRole('dialog', { name: 'Tour' });

  it('shows on first visit, walks four steps, and does not return after Done', () => {
    useUiStore.setState({ tourSeen: false });
    const { unmount } = render(<App />);
    expect(within(tour()!).getByText(/Draw walls by dragging on the grid/)).toBeInTheDocument();
    expect(within(tour()!).getByText('1 of 4')).toBeInTheDocument();

    fireEvent.click(button('Next'));
    expect(within(tour()!).getByText(/Pick an algorithm here/)).toBeInTheDocument();
    fireEvent.click(button('Next'));
    expect(within(tour()!).getByText(/step forward or backward one operation/)).toBeInTheDocument();
    fireEvent.click(button('Next'));
    expect(within(tour()!).getByText(/Follow along here/)).toBeInTheDocument();
    expect(within(tour()!).getByText('4 of 4')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Next' })).toBeNull();

    fireEvent.click(button('Done'));
    expect(tour()).toBeNull();
    expect(useUiStore.getState().tourSeen).toBe(true);

    unmount();
    render(<App />);
    expect(tour()).toBeNull();
  });

  it('can be skipped at any step', () => {
    useUiStore.setState({ tourSeen: false });
    render(<App />);
    fireEvent.click(button('Next'));
    fireEvent.click(button('Skip tour'));
    expect(tour()).toBeNull();
    expect(useUiStore.getState().tourSeen).toBe(true);
  });

  it('closes on Escape', () => {
    useUiStore.setState({ tourSeen: false });
    render(<App />);
    fireEvent.keyDown(document.body, { key: 'Escape' });
    expect(tour()).toBeNull();
  });

  it('reopens from the Show tour button, starting at the first step', () => {
    useUiStore.setState({ tourSeen: false });
    render(<App />);
    fireEvent.click(button('Next'));
    fireEvent.click(button('Skip tour'));
    fireEvent.click(button('Show tour'));
    expect(within(tour()!).getByText('1 of 4')).toBeInTheDocument();
  });

  it('leaves the playback shortcuts alone while it is closed', () => {
    render(<App />);
    fireEvent.keyDown(document.body, { key: 'Escape' });
    fireEvent.keyDown(document.body, { key: ' ' });
    expect(play().playing).toBe(true);
  });
});

describe('grid keyboard', () => {
  const focusable = () => document.querySelectorAll('[data-cell][tabindex="0"]');

  it('is a single tab stop that starts on the start cell', () => {
    render(<App />);
    expect(focusable()).toHaveLength(1);
    expect(focusable()[0]).toBe(cell(grid().start));
  });

  it('arrows move the cursor and carry the tab stop with it', () => {
    render(<App />);
    cell(0).focus();
    press('ArrowRight');
    expect(cell(1)).toHaveFocus();
    press('ArrowDown');
    expect(cell(1 + COLS)).toHaveFocus();
    press('ArrowLeft');
    press('ArrowUp');
    expect(cell(0)).toHaveFocus();
    expect(focusable()).toHaveLength(1);
    expect(focusable()[0]).toBe(cell(0));
  });

  it('stops at the edges', () => {
    render(<App />);
    cell(0).focus();
    press('ArrowLeft');
    press('ArrowUp');
    expect(cell(0)).toHaveFocus();
    const last = 8 * COLS - 1;
    cell(last).focus();
    press('ArrowRight');
    press('ArrowDown');
    expect(cell(last)).toHaveFocus();
  });

  it('Enter toggles a wall and a digit sets a weight', () => {
    render(<App />);
    cell(0).focus();
    press('Enter');
    expect(cell(0)).toHaveAttribute('data-kind', 'wall');
    press('Enter');
    expect(cell(0)).toHaveAttribute('data-kind', 'empty');
    press('7');
    expect(grid().grid.weights[0]).toBe(7);
    press('1');
    expect(grid().grid.weights[0]).toBe(1);
    expect(cell(0)).toHaveFocus();
  });

  it('S and E move the endpoints to the cursor', () => {
    render(<App />);
    cell(0).focus();
    press('s');
    expect(grid().start).toBe(0);
    press('ArrowRight');
    press('E');
    expect(grid().end).toBe(1);
  });

  it('keeps handled keys from scrolling and leaves others alone', () => {
    render(<App />);
    cell(0).focus();
    expect(press('ArrowDown')).toBe(false);
    expect(press('q')).toBe(true);
  });

  it('inspects the focused cell', () => {
    render(<App />);
    cell(5).focus();
    expect(useUiStore.getState().inspected).toEqual({ pane: 0, cell: 5 });
    press('ArrowRight');
    expect(useUiStore.getState().inspected).toEqual({ pane: 0, cell: 6 });
  });

  it('puts the tab stop back on the start cell after a resize', () => {
    render(<App />);
    cell(0).focus();
    press('ArrowRight');
    act(() => grid().resize(6, 6));
    expect(focusable()).toHaveLength(1);
    expect(focusable()[0]).toBe(cell(grid().start));
  });
});

describe('accessible names', () => {
  it('labels cells with row, column and kind', () => {
    grid().setWall(toId(COLS, 4, 7), true);
    grid().setWeight(toId(COLS, 0, 2), 6);
    render(<App />);
    expect(cell(toId(COLS, 4, 7))).toHaveAttribute('aria-label', 'Row 4, column 7, wall');
    expect(cell(toId(COLS, 0, 2))).toHaveAttribute('aria-label', 'Row 0, column 2, weight 6');
    expect(cell(0)).toHaveAttribute('aria-label', 'Row 0, column 0, empty');
    expect(cell(grid().start)).toHaveAttribute('aria-label', 'Row 4, column 3, start');
    expect(cell(grid().end)).toHaveAttribute('aria-label', 'Row 4, column 8, end');
  });

  it('the timeline announces "Step n of m"', () => {
    render(<App />);
    fireEvent.click(button('Run'));
    act(() => {
      play().pause();
      play().seek(7);
    });
    expect(screen.getByRole('slider', { name: 'Timeline' })).toHaveAttribute(
      'aria-valuetext',
      `Step 7 of ${play().length}`,
    );
  });

  it('narration is a polite live region when paused and off while playing', () => {
    render(<App />);
    const narration = () =>
      within(screen.getByRole('region', { name: 'Narration' })).getByText(/./, { selector: 'p' });
    expect(narration()).toHaveAttribute('aria-live', 'polite');
    fireEvent.click(button('Run'));
    expect(narration()).toHaveAttribute('aria-live', 'off');
    act(() => play().pause());
    expect(narration()).toHaveAttribute('aria-live', 'polite');
  });
});
