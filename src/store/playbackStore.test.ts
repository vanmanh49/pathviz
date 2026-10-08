import { beforeEach, describe, expect, it } from 'vitest';
import { toId } from '../algorithms/grid';
import { useGridStore } from './gridStore';
import { usePlaybackStore } from './playbackStore';

const COLS = 12;
const play = () => usePlaybackStore.getState();
const grid = () => useGridStore.getState();

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
});

describe('running', () => {
  it('starts with no run', () => {
    expect(play()).toMatchObject({ runs: null, index: 0, length: 0, playing: false });
  });

  it('run() computes a run and starts playing at step 0', () => {
    play().run();
    const { runs, index, length, playing } = play();
    expect(runs).toHaveLength(1);
    expect(runs![0].info.id).toBe('bfs');
    expect(length).toBe(runs![0].playback.length);
    expect(length).toBeGreaterThan(0);
    expect(index).toBe(0);
    expect(playing).toBe(true);
  });

  it('at instant speed run() lands on the last step, paused', () => {
    play().setSpeed(Infinity);
    play().run();
    expect(play().index).toBe(play().length);
    expect(play().playing).toBe(false);
    expect(play().runs![0].playback.state.result).toBe('found');
  });

  it('records the path of a Dijkstra run and marks it optimal', () => {
    play().setAlgorithm(0, 'dijkstra');
    play().run();
    expect(play().runs![0]).toMatchObject({ pathLength: 5, pathCost: 5, optimal: true });
    expect(play().runs![0].computeMs).toBeGreaterThanOrEqual(0);
  });

  it('marks a BFS run as not optimal when weights make its route dearer', () => {
    for (let col = 4; col <= 7; col++) grid().setWeight(toId(COLS, 4, col), 9);
    play().run();
    expect(play().runs![0]).toMatchObject({ pathLength: 5, pathCost: 37, optimal: false });
  });

  it('reports no path with null length, cost and optimal', () => {
    for (let row = 0; row < 8; row++) grid().setWall(toId(COLS, row, 5), true);
    play().run();
    expect(play().runs![0]).toMatchObject({ pathLength: null, pathCost: null, optimal: null });
  });
});

describe('moving through a run', () => {
  it('seek moves the underlying playback', () => {
    play().run();
    play().seek(7);
    expect(play().index).toBe(7);
    expect(play().runs![0].playback.index).toBe(7);
  });

  it('step and seek clamp to [0, length]', () => {
    play().run();
    play().step(-1);
    expect(play().index).toBe(0);
    play().seek(1e9);
    expect(play().index).toBe(play().length);
    play().step(1);
    expect(play().index).toBe(play().length);
    play().seek(-5);
    expect(play().index).toBe(0);
  });

  it('seek and step do nothing without a run', () => {
    play().seek(5);
    play().step(1);
    expect(play().index).toBe(0);
  });

  it('stops playing when it reaches the end', () => {
    play().run();
    play().step(play().length);
    expect(play().playing).toBe(false);
  });

  it('toggle starts a run when there is none', () => {
    play().toggle();
    expect(play().runs).not.toBeNull();
    expect(play().playing).toBe(true);
  });

  it('toggle pauses and resumes mid-run', () => {
    play().run();
    play().seek(3);
    play().toggle();
    expect(play().playing).toBe(false);
    play().toggle();
    expect(play().playing).toBe(true);
    expect(play().index).toBe(3);
  });

  it('toggle at the end restarts from step 0', () => {
    play().run();
    play().seek(play().length);
    play().toggle();
    expect(play().index).toBe(0);
    expect(play().playing).toBe(true);
  });

  it('switching to instant speed while playing jumps to the end', () => {
    play().run();
    play().setSpeed(Infinity);
    expect(play().index).toBe(play().length);
    expect(play().playing).toBe(false);
  });
});

describe('invalidation', () => {
  it.each<[string, () => void]>([
    ['a wall edit', () => grid().setWall(0, true)],
    ['a weight edit', () => grid().setWeight(0, 4)],
    ['an endpoint move', () => grid().moveStart(0)],
    ['a resize', () => grid().resize(6, 6)],
    ['the diagonal toggle', () => grid().setDiagonal(true)],
    ['an algorithm change', () => play().setAlgorithm(0, 'dijkstra')],
    ['a heuristic change', () => play().setHeuristic(0, 'euclidean')],
    ['the compare toggle', () => play().setCompare(true)],
    ['clearRun', () => play().clearRun()],
  ])('discards the run on %s', (_name, change) => {
    play().run();
    play().seek(3);
    change();
    expect(play()).toMatchObject({ runs: null, index: 0, length: 0, playing: false });
  });

  it('keeps the run when an edit changes nothing', () => {
    play().run();
    grid().setWall(grid().start, true);
    expect(play().runs).not.toBeNull();
  });

  it('updates the pane settings', () => {
    play().setAlgorithm(1, 'bfs');
    play().setHeuristic(0, 'octile');
    expect(play().panes).toEqual([
      { algorithmId: 'bfs', heuristic: 'octile' },
      { algorithmId: 'bfs', heuristic: 'manhattan' },
    ]);
  });
});

describe('generators', () => {
  it('generating a maze discards the current run', () => {
    play().run();
    grid().generate('random-walls', 1, true);
    expect(play().runs).toBeNull();
    expect(play().playing).toBe(false);
  });

  it('run() waits until a maze has finished generating', () => {
    useGridStore.setState({ generating: true });
    play().run();
    expect(play().runs).toBeNull();
    useGridStore.setState({ generating: false });
    play().run();
    expect(play().runs).not.toBeNull();
  });
});
