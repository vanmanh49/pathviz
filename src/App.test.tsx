import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { useGridStore } from './store/gridStore';
import { usePlaybackStore } from './store/playbackStore';

const play = () => usePlaybackStore.getState();
const grid = () => useGridStore.getState();
const button = (name: string) => screen.getByRole('button', { name });
const states = () =>
  Array.from(document.querySelectorAll<HTMLElement>('[data-cell]'), (el) => el.dataset.state ?? '');

/** Starts a run from the interface and pauses it so steps are under the test's control. */
function runPaused() {
  fireEvent.click(button('Run'));
  act(() => play().pause());
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
});

afterEach(() => {
  vi.useRealTimers();
});

describe('controls', () => {
  it('Run then Step forward shows "Step 1 / N"', () => {
    render(<App />);
    fireEvent.click(button('Run'));
    fireEvent.click(button('Step forward'));
    expect(screen.getByText(`Step 1 / ${play().length}`)).toBeInTheDocument();
    expect(play().playing).toBe(false);
  });

  it('disables stepping until there is a run', () => {
    render(<App />);
    expect(button('Step forward')).toBeDisabled();
    expect(button('Step back')).toBeDisabled();
    expect(screen.getByRole('slider', { name: 'Timeline' })).toBeDisabled();
    fireEvent.click(button('Run'));
    expect(button('Step forward')).toBeEnabled();
  });

  it('shows Pause while playing and Play while paused', () => {
    render(<App />);
    fireEvent.click(button('Play'));
    expect(play().playing).toBe(true);
    fireEvent.click(button('Pause'));
    expect(play().playing).toBe(false);
    expect(button('Play')).toBeInTheDocument();
  });

  it('steps back, and jumps to either end', () => {
    render(<App />);
    runPaused();
    fireEvent.click(button('Step forward'));
    fireEvent.click(button('Step forward'));
    fireEvent.click(button('Step back'));
    expect(play().index).toBe(1);
    fireEvent.click(button('Jump to end'));
    expect(play().index).toBe(play().length);
    fireEvent.click(button('Jump to start'));
    expect(play().index).toBe(0);
  });

  it('moves the timeline when stepping and seeks when the timeline changes', () => {
    render(<App />);
    runPaused();
    const timeline = screen.getByRole('slider', { name: 'Timeline' });
    fireEvent.click(button('Step forward'));
    expect(timeline).toHaveValue('1');
    fireEvent.change(timeline, { target: { value: '5' } });
    expect(play().index).toBe(5);
  });

  it('scrubbing the timeline pauses playback', () => {
    render(<App />);
    fireEvent.click(button('Run'));
    fireEvent.change(screen.getByRole('slider', { name: 'Timeline' }), { target: { value: '4' } });
    expect(play().playing).toBe(false);
  });

  it('sets the speed, with Instant as the last option', () => {
    render(<App />);
    const speed = screen.getByRole('combobox', { name: 'Speed' });
    fireEvent.change(speed, { target: { value: '5' } });
    expect(play().speed).toBe(10);
    fireEvent.change(speed, { target: { value: '6' } });
    expect(play().speed).toBe(Infinity);
  });

  it('picks the algorithm from the select', () => {
    render(<App />);
    fireEvent.change(screen.getByRole('combobox', { name: 'Algorithm' }), {
      target: { value: 'dijkstra' },
    });
    expect(play().panes[0].algorithmId).toBe('dijkstra');
  });

  it('Clear path discards the run', () => {
    render(<App />);
    runPaused();
    fireEvent.click(button('Clear path'));
    expect(play().runs).toBeNull();
  });
});

describe('painting', () => {
  it('paints exactly one current cell after a visit event', () => {
    render(<App />);
    runPaused();
    act(() => play().seek(3));
    const current = document.querySelectorAll<HTMLElement>('[data-state="current"]');
    expect(current).toHaveLength(1);
    expect(current[0].dataset.cell).toBe(String(grid().start));
  });

  it('paints discovered cells as frontier and expanded ones as visited', () => {
    render(<App />);
    runPaused();
    act(() => play().seek(40));
    const painted = states();
    expect(painted.filter((s) => s === 'frontier').length).toBeGreaterThan(0);
    expect(painted.filter((s) => s === 'visited').length).toBeGreaterThan(0);
  });

  it('paints the final path in order from the start', () => {
    render(<App />);
    runPaused();
    act(() => play().seek(play().length));
    const path = document.querySelectorAll<HTMLElement>('[data-state="path"]');
    expect(path).toHaveLength(play().runs![0].pathLength! + 1);
    const start = document.querySelector<HTMLElement>(`[data-cell="${grid().start}"]`)!;
    const end = document.querySelector<HTMLElement>(`[data-cell="${grid().end}"]`)!;
    expect(start.style.getPropertyValue('--i')).toBe('0');
    expect(end.style.getPropertyValue('--i')).toBe(String(play().runs![0].pathLength));
  });

  it('repaints the same picture when stepping back to an earlier step', () => {
    render(<App />);
    runPaused();
    act(() => play().seek(25));
    const before = states();
    act(() => play().seek(play().length));
    act(() => play().seek(25));
    expect(states()).toEqual(before);
    expect(document.querySelector('[style*="--i"]')).toBeNull();
  });

  it('clears every data-state when the run is discarded', () => {
    render(<App />);
    runPaused();
    act(() => play().seek(40));
    act(() => grid().setWall(0, true));
    expect(play().runs).toBeNull();
    expect(states().every((s) => s === '')).toBe(true);
  });
});

describe('keyboard shortcuts', () => {
  const press = (target: Element, key: string, init: KeyboardEventInit = {}) =>
    fireEvent.keyDown(target, { key, ...init });

  it('Space toggles play, arrows step, R returns to step 0', () => {
    render(<App />);
    press(document.body, ' ');
    expect(play().playing).toBe(true);
    press(document.body, ' ');
    expect(play().playing).toBe(false);
    press(document.body, 'ArrowRight');
    press(document.body, 'ArrowRight');
    expect(play().index).toBe(2);
    press(document.body, 'ArrowLeft');
    expect(play().index).toBe(1);
    press(document.body, 'r');
    expect(play().index).toBe(0);
    expect(play().playing).toBe(false);
  });

  it('Home and End jump to the first and last step', () => {
    render(<App />);
    runPaused();
    press(document.body, 'End');
    expect(play().index).toBe(play().length);
    press(document.body, 'Home');
    expect(play().index).toBe(0);
  });

  it('stepping with the arrow keys pauses playback', () => {
    render(<App />);
    fireEvent.click(button('Run'));
    press(document.body, 'ArrowRight');
    expect(play().playing).toBe(false);
  });

  it('keeps handled keys from scrolling the page', () => {
    render(<App />);
    expect(press(document.body, ' ')).toBe(false);
    expect(press(document.body, 'x')).toBe(true);
  });

  it('Space on a focused select or button is left to that control', () => {
    render(<App />);
    expect(press(screen.getByRole('combobox', { name: 'Speed' }), ' ')).toBe(true);
    expect(press(button('Clear walls'), ' ')).toBe(true);
    expect(play().runs).toBeNull();
  });

  it('a button clicked with the mouse gives up focus, so Space still plays and pauses', () => {
    render(<App />);
    const run = button('Run');
    run.focus();
    fireEvent.click(run, { detail: 1 });
    expect(run).not.toHaveFocus();
    press(document.activeElement!, ' ');
    expect(play().playing).toBe(false);
    expect(play().index).toBe(0);
    expect(play().runs).not.toBeNull();
  });

  it('a button activated from the keyboard keeps focus', () => {
    render(<App />);
    const run = button('Run');
    run.focus();
    fireEvent.click(run, { detail: 0 });
    expect(run).toHaveFocus();
  });

  it('ArrowRight on the timeline or a select does not also step', () => {
    render(<App />);
    runPaused();
    press(screen.getByRole('slider', { name: 'Timeline' }), 'ArrowRight');
    press(screen.getByRole('combobox', { name: 'Speed' }), 'ArrowRight');
    expect(play().index).toBe(0);
  });

  it('arrow keys inside the grid do not step', () => {
    render(<App />);
    runPaused();
    press(document.querySelector('[data-cell="0"]')!, 'ArrowRight');
    expect(play().index).toBe(0);
  });

  it('typing r in a select does not reset playback', () => {
    render(<App />);
    runPaused();
    act(() => play().seek(5));
    press(screen.getByRole('combobox', { name: 'Algorithm' }), 'r');
    expect(play().index).toBe(5);
  });

  it('Ctrl+R is left alone', () => {
    render(<App />);
    runPaused();
    act(() => play().seek(5));
    expect(press(document.body, 'r', { ctrlKey: true })).toBe(true);
    expect(play().index).toBe(5);
  });
});

describe('playback loop', () => {
  it('advances about 60 events per second at 1×', () => {
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame'] });
    render(<App />);
    fireEvent.click(button('Run'));
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(play().index).toBeGreaterThan(50);
    expect(play().index).toBeLessThan(70);
  });

  it('advances ten times faster at 10×', () => {
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame'] });
    grid().resize(20, 40);
    act(() => play().setSpeed(10));
    render(<App />);
    fireEvent.click(button('Run'));
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(play().index).toBeGreaterThan(250);
    expect(play().index).toBeLessThan(350);
  });

  it('does not advance while paused', () => {
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame'] });
    render(<App />);
    runPaused();
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(play().index).toBe(0);
  });
});
