import { describe, expect, it } from 'vitest';
import { parseGrid, randomCase } from '../algorithms/testUtils';
import type { StepEvent } from '../algorithms/types';
import { ALGORITHMS, getAlgorithm } from '../data/algorithms';
import { mulberry32 } from '../utils/rng';
import {
  DISCOVERED,
  FRONTIER,
  Playback,
  UNSEEN,
  VISITED,
  applyEvent,
  checkpointInterval,
  createState,
  frontierItems,
} from './playback';

const OPTIONS = { diagonal: false, heuristic: 'manhattan' } as const;
const ROWS = 10;
const COLS = 15;
const SIZE = ROWS * COLS;

/** The first seeded random grid on which the algorithm runs long enough to cross several checkpoints. */
function randomRun(id: string) {
  for (let seed = 1; ; seed++) {
    const rates = { wall: 0.2, weight: 0.3 };
    const { grid, start, end } = randomCase(mulberry32(seed), ROWS, COLS, rates);
    const events = getAlgorithm(id).run(grid, start, end, OPTIONS);
    if (events.length > 300) return events;
  }
}

function replay(events: StepEvent[], count: number, size = SIZE) {
  const state = createState(size);
  for (let i = 0; i < count; i++) applyEvent(state, events[i]);
  return state;
}

describe('applyEvent', () => {
  it('relax records distance and parent and marks an unseen cell discovered', () => {
    const state = createState(4);
    applyEvent(state, { type: 'relax', node: 2, from: 1, oldDist: Infinity, newDist: 3, line: 1 });
    expect(state.dist[2]).toBe(3);
    expect(state.parent[2]).toBe(1);
    expect(state.status[2]).toBe(DISCOVERED);
  });

  it('enqueue puts the cell in the frontier with its priority, h and side', () => {
    const state = createState(4);
    applyEvent(state, { type: 'enqueue', node: 1, priority: 7, h: 4, side: 1, line: 1 });
    applyEvent(state, { type: 'enqueue', node: 3, line: 1 });
    expect(state.status[1]).toBe(FRONTIER);
    expect([state.priority[1], state.h[1], state.side[1]]).toEqual([7, 4, 1]);
    expect(state.seq[3]).toBeGreaterThan(state.seq[1]);
  });

  it('visit takes the cell out of the frontier and makes it current', () => {
    const state = createState(4);
    applyEvent(state, { type: 'enqueue', node: 1, line: 1 });
    applyEvent(state, { type: 'visit', node: 1, line: 1 });
    expect(state.status[1]).toBe(VISITED);
    expect(state.current).toBe(1);
    expect(state.visitedCount).toBe(1);
  });

  it('counts each cell as visited once', () => {
    const state = createState(4);
    applyEvent(state, { type: 'visit', node: 1, line: 1 });
    applyEvent(state, { type: 'visit', node: 1, line: 1 });
    expect(state.visitedCount).toBe(1);
  });

  it('a later relax leaves a visited cell visited', () => {
    const state = createState(4);
    applyEvent(state, { type: 'visit', node: 1, line: 1 });
    applyEvent(state, { type: 'relax', node: 1, from: 0, oldDist: 9, newDist: 4, line: 1 });
    expect(state.status[1]).toBe(VISITED);
    expect(state.dist[1]).toBe(4);
  });

  it('skip changes nothing', () => {
    const state = createState(4);
    applyEvent(state, { type: 'skip', node: 1, reason: 'already visited', line: 1 });
    expect(state).toEqual(createState(4));
  });

  it('pass, found, path and noPath update the run summary', () => {
    const state = createState(4);
    applyEvent(state, { type: 'pass', n: 3, line: 2 });
    expect(state.pass).toBe(3);
    applyEvent(state, { type: 'found', node: 2, line: 4 });
    expect(state.result).toBe('found');
    expect(state.current).toBe(2);
    applyEvent(state, { type: 'path', nodes: [0, 1, 2], line: 4 });
    expect(state.path).toEqual([0, 1, 2]);

    const other = createState(4);
    applyEvent(other, { type: 'visit', node: 1, line: 1 });
    applyEvent(other, { type: 'noPath', line: 9 });
    expect(other.result).toBe('noPath');
    expect(other.current).toBe(-1);
  });
});

describe('Playback', () => {
  it('uses a checkpoint interval of max(50, ceil(length / 200))', () => {
    expect(checkpointInterval(0)).toBe(50);
    expect(checkpointInterval(120)).toBe(50);
    expect(checkpointInterval(40000)).toBe(200);
    expect(checkpointInterval(10001)).toBe(51);
  });

  it('starts at step 0 with an untouched state and no current event', () => {
    const playback = new Playback(SIZE, randomRun('bfs'));
    expect(playback.index).toBe(0);
    expect(playback.current).toBeUndefined();
    expect(playback.state).toEqual(createState(SIZE));
  });

  it('exposes the event at the current position', () => {
    const events = randomRun('bfs');
    const playback = new Playback(SIZE, events);
    playback.seek(5);
    expect(playback.index).toBe(5);
    expect(playback.current).toBe(events[4]);
  });

  it('clamps seek below 0 and above length', () => {
    const events = randomRun('bfs');
    const playback = new Playback(SIZE, events);
    playback.seek(-10);
    expect(playback.index).toBe(0);
    playback.seek(events.length + 10);
    expect(playback.index).toBe(events.length);
    expect(playback.length).toBe(events.length);
  });

  it('finishes in the found state holding the emitted path', () => {
    const { grid, start, end } = parseGrid(['S....', '.....', '....E']);
    const events = getAlgorithm('bfs').run(grid, start, end, OPTIONS);
    const playback = new Playback(15, events);
    playback.seek(events.length);
    const last = events[events.length - 1];
    expect(playback.state.result).toBe('found');
    expect(playback.state.path).toEqual(last.type === 'path' ? last.nodes : null);
    expect(playback.state.current).toBe(end);
  });

  it('finishes in the noPath state on a sealed grid', () => {
    const { grid, start, end } = parseGrid(['S.#.E', '..#..']);
    const events = getAlgorithm('bfs').run(grid, start, end, OPTIONS);
    const playback = new Playback(10, events);
    playback.seek(events.length);
    expect(playback.state.result).toBe('noPath');
    expect(playback.state.path).toBeNull();
  });

  it('stays correct when the checkpoint interval grows past 50', () => {
    const rng = mulberry32(3);
    const events: StepEvent[] = Array.from({ length: 12000 }, (_, i) => {
      const node = Math.floor(rng() * SIZE);
      return i % 3 === 0
        ? { type: 'visit', node, line: 1 }
        : i % 3 === 1
          ? { type: 'relax', node, from: 0, oldDist: Infinity, newDist: i, line: 1 }
          : { type: 'enqueue', node, priority: i, line: 1 };
    });
    expect(checkpointInterval(events.length)).toBe(60);
    const playback = new Playback(SIZE, events);
    for (const target of [11999, 61, 60, 59, 7300, 7299, 0, 12000]) {
      playback.seek(target);
      expect(playback.state).toEqual(replay(events, target));
    }
  });
});

describe.each(ALGORITHMS.map((a) => a.id))('%s playback', (id) => {
  const events = randomRun(id);

  it('produces enough events to cross several checkpoints', () => {
    expect(events.length).toBeGreaterThan(150);
  });

  it('stepping forward N then back N returns the initial state', () => {
    const playback = new Playback(SIZE, events);
    for (let i = 1; i <= playback.length; i++) playback.seek(i);
    expect(playback.state).toEqual(replay(events, events.length));
    for (let i = playback.length - 1; i >= 0; i--) playback.seek(i);
    expect(playback.state).toEqual(createState(SIZE));
  });

  it('every single step back matches a replay from scratch', () => {
    const playback = new Playback(SIZE, events);
    playback.seek(playback.length);
    for (let i = playback.length - 1; i >= 0; i -= 7) {
      playback.seek(i);
      expect(playback.state).toEqual(replay(events, i));
    }
  });

  it('seek(i) from anywhere equals applying the first i events from scratch', () => {
    const playback = new Playback(SIZE, events);
    const rng = mulberry32(99);
    for (let n = 0; n < 300; n++) {
      const target = Math.floor(rng() * (events.length + 1));
      playback.seek(target);
      expect(playback.state).toEqual(replay(events, target));
    }
  });

  it('the head of the frontier is always the next cell visited', () => {
    const { frontier } = getAlgorithm(id);
    if (frontier === 'none') return;
    const playback = new Playback(SIZE, events);
    events.forEach((event, i) => {
      if (event.type !== 'visit') return;
      playback.seek(i);
      expect(frontierItems(playback.state, frontier, event.side)[0].node).toBe(event.node);
    });
  });
});

describe('frontierItems', () => {
  const enqueue = (node: number, priority?: number, h?: number): StepEvent => ({
    type: 'enqueue',
    node,
    priority,
    h,
    line: 1,
  });

  it('lists a queue first in, first out', () => {
    const state = replay([enqueue(3), enqueue(1), enqueue(2)], 3, 4);
    expect(frontierItems(state, 'queue').map((item) => item.node)).toEqual([3, 1, 2]);
  });

  it('lists a stack last in, first out, and a re-pushed cell moves to the top', () => {
    const state = replay([enqueue(3), enqueue(1), enqueue(2), enqueue(3)], 4, 4);
    expect(frontierItems(state, 'stack').map((item) => item.node)).toEqual([3, 2, 1]);
  });

  it('lists a heap by priority, then h, then insertion', () => {
    const events = [enqueue(0, 5, 1), enqueue(1, 3, 2), enqueue(2, 3, 1), enqueue(3, 3, 1)];
    const state = replay(events, 4, 4);
    expect(frontierItems(state, 'heap').map((item) => item.node)).toEqual([2, 3, 1, 0]);
  });

  it('reports g, h and priority for each item', () => {
    const state = createState(4);
    applyEvent(state, { type: 'relax', node: 1, from: 0, oldDist: Infinity, newDist: 6, line: 1 });
    applyEvent(state, enqueue(1, 10, 4));
    expect(frontierItems(state, 'heap')).toEqual([{ node: 1, g: 6, h: 4, priority: 10, side: 0 }]);
  });

  it('leaves out cells that are only discovered or already visited', () => {
    const state = createState(4);
    applyEvent(state, { type: 'relax', node: 1, from: 0, oldDist: Infinity, newDist: 1, line: 1 });
    applyEvent(state, enqueue(2));
    applyEvent(state, { type: 'visit', node: 2, line: 1 });
    expect(state.status[0]).toBe(UNSEEN);
    expect(frontierItems(state, 'queue')).toEqual([]);
  });

  it('can be limited to one side of a bidirectional search', () => {
    const state = createState(4);
    applyEvent(state, { type: 'enqueue', node: 0, side: 0, line: 1 });
    applyEvent(state, { type: 'enqueue', node: 3, side: 1, line: 1 });
    expect(frontierItems(state, 'queue', 1).map((item) => item.node)).toEqual([3]);
  });

  it('is empty for algorithms without a frontier structure', () => {
    const state = replay([enqueue(1)], 1, 4);
    expect(frontierItems(state, 'none')).toEqual([]);
  });
});
