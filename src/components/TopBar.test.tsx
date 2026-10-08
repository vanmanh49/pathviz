import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useGridStore } from '../store/gridStore';
import { usePlaybackStore } from '../store/playbackStore';
import { useUiStore } from '../store/uiStore';
import { TopBar } from './TopBar';

const grid = () => useGridStore.getState();

beforeEach(() => {
  grid().resize(10, 10);
  grid().setDiagonal(false);
  useUiStore.setState({ tool: 'wall', brush: 5 });
  usePlaybackStore.setState({
    panes: [
      { algorithmId: 'bfs', heuristic: 'manhattan' },
      { algorithmId: 'dijkstra', heuristic: 'manhattan' },
    ],
  });
  render(<TopBar />);
});

it('selects an edit tool and marks it pressed', () => {
  fireEvent.click(screen.getByRole('button', { name: 'Erase tool' }));
  expect(useUiStore.getState().tool).toBe('erase');
  expect(screen.getByRole('button', { name: 'Erase tool' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  expect(screen.getByRole('button', { name: 'Wall tool' })).toHaveAttribute(
    'aria-pressed',
    'false',
  );
});

it('sets the weight brush', () => {
  fireEvent.change(screen.getByRole('combobox', { name: 'Weight value' }), {
    target: { value: '8' },
  });
  expect(useUiStore.getState().brush).toBe(8);
});

it('toggles diagonal movement', () => {
  const toggle = screen.getByRole('button', { name: 'Diagonal movement' });
  fireEvent.click(toggle);
  expect(grid().diagonal).toBe(true);
  expect(toggle).toHaveAttribute('aria-pressed', 'true');
});

it('clears walls, clears weights and resets everything', () => {
  grid().setWall(0, true);
  grid().setWeight(1, 6);
  fireEvent.click(screen.getByRole('button', { name: 'Clear walls' }));
  expect(grid().grid.walls[0]).toBe(0);
  expect(grid().grid.weights[1]).toBe(6);
  fireEvent.click(screen.getByRole('button', { name: 'Clear weights' }));
  expect(grid().grid.weights[1]).toBe(1);
  grid().moveStart(0);
  fireEvent.click(screen.getByRole('button', { name: 'Reset all' }));
  expect(grid().start).not.toBe(0);
});

it('resizes the grid from the row and column sliders', () => {
  fireEvent.change(screen.getByRole('slider', { name: 'Rows' }), { target: { value: '12' } });
  fireEvent.change(screen.getByRole('slider', { name: 'Columns' }), { target: { value: '20' } });
  expect(grid().grid.rows).toBe(12);
  expect(grid().grid.cols).toBe(20);
});

describe('heuristic', () => {
  const pick = (name: string, value: string) =>
    fireEvent.change(screen.getByRole('combobox', { name }), { target: { value } });

  it('offers a heuristic only for algorithms that use one', () => {
    expect(screen.queryByRole('combobox', { name: 'Heuristic' })).toBeNull();
    pick('Algorithm', 'astar');
    expect(screen.getByRole('combobox', { name: 'Heuristic' })).toHaveValue('manhattan');
    pick('Algorithm', 'greedy');
    expect(screen.getByRole('combobox', { name: 'Heuristic' })).toBeInTheDocument();
    pick('Algorithm', 'dijkstra');
    expect(screen.queryByRole('combobox', { name: 'Heuristic' })).toBeNull();
  });

  it('sets the heuristic', () => {
    pick('Algorithm', 'astar');
    pick('Heuristic', 'octile');
    expect(usePlaybackStore.getState().panes[0].heuristic).toBe('octile');
  });

  it('warns when A* is given a heuristic that overestimates', () => {
    pick('Algorithm', 'astar');
    expect(screen.queryByText(/overestimates/)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Diagonal movement' }));
    expect(screen.getByText(/overestimates/)).toBeInTheDocument();
    pick('Heuristic', 'octile');
    expect(screen.queryByText(/overestimates/)).toBeNull();
  });

  it('does not warn for greedy search, which is never optimal anyway', () => {
    pick('Algorithm', 'greedy');
    fireEvent.click(screen.getByRole('button', { name: 'Diagonal movement' }));
    expect(screen.queryByText(/overestimates/)).toBeNull();
  });
});
