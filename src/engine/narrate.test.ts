import { expect, it } from 'vitest';
import { toId } from '../algorithms/grid';
import type { FrontierKind, StepEvent } from '../algorithms/types';
import { narrate } from './narrate';
import { applyEvent, createState } from './playback';

const COLS = 50;
const u = toId(COLS, 4, 7);
const v = toId(COLS, 4, 8);
const goal = toId(COLS, 4, 9);

/** Narrates `event` as the last of `events`, the way the interface does after applying it. */
function say(
  event: StepEvent | undefined,
  frontier: FrontierKind = 'queue',
  before: StepEvent[] = [],
) {
  const state = createState(25 * COLS);
  before.forEach((e) => applyEvent(state, e));
  if (event) applyEvent(state, event);
  return narrate(event, state, { cols: COLS, frontier, end: goal });
}

const reached = (node: number, dist: number): StepEvent => ({
  type: 'relax',
  node,
  from: 0,
  oldDist: Infinity,
  newDist: dist,
  line: 1,
});

it('invites the learner to start before the first step', () => {
  expect(say(undefined)).toBe('Ready. Press play or step forward to begin.');
});

it.each<[FrontierKind, string]>([
  ['queue', 'Popped (4,7) from the queue with distance 12.'],
  ['stack', 'Popped (4,7) from the stack with distance 12.'],
  ['heap', 'Popped (4,7) from the priority queue with distance 12.'],
  ['none', 'Scanning the edges out of (4,7), distance 12.'],
])('describes a visit for a %s', (frontier, sentence) => {
  expect(say({ type: 'visit', node: u, line: 3 }, frontier, [reached(u, 12)])).toBe(sentence);
});

it('names the side a bidirectional visit belongs to', () => {
  const visit = (side: 0 | 1): StepEvent => ({ type: 'visit', node: u, line: 3, side });
  expect(say(visit(0), 'queue', [reached(u, 2)])).toBe(
    'Popped (4,7) from the start-side queue with distance 2.',
  );
  expect(say(visit(1), 'queue', [reached(u, 2)])).toBe(
    'Popped (4,7) from the goal-side queue with distance 2.',
  );
});

it('describes the first relaxation of the start and of the goal', () => {
  const origin = (side?: 0 | 1): StepEvent => ({
    type: 'relax',
    node: u,
    from: -1,
    oldDist: Infinity,
    newDist: 0,
    line: 1,
    side,
  });
  expect(say(origin())).toBe('Start (4,7) gets distance 0.');
  expect(say(origin(0))).toBe('Start (4,7) gets distance 0.');
  expect(say(origin(1))).toBe('Goal (4,7) gets distance 0.');
});

it('describes an improvement', () => {
  const relax = (oldDist: number, newDist: number): StepEvent => ({
    type: 'relax',
    node: v,
    from: u,
    oldDist,
    newDist,
    line: 7,
  });
  expect(say(relax(Infinity, 13))).toBe('Neighbor (4,8) of (4,7) improved from ∞ to 13.');
  expect(say(relax(15, 13))).toBe('Neighbor (4,8) of (4,7) improved from 15 to 13.');
  expect(say(relax(Infinity, 2 + Math.SQRT2))).toBe(
    'Neighbor (4,8) of (4,7) improved from ∞ to 3.41.',
  );
});

it('describes a relaxation that is not an improvement as a new route', () => {
  expect(say({ type: 'relax', node: v, from: u, oldDist: 9, newDist: 13, line: 9 })).toBe(
    'Neighbor (4,8) is now reached through (4,7), distance 13.',
  );
});

it('describes an enqueue for each kind of frontier', () => {
  const enqueue = (priority?: number, h?: number): StepEvent => ({
    type: 'enqueue',
    node: v,
    priority,
    h,
    line: 8,
  });
  expect(say(enqueue(), 'queue')).toBe('Added (4,8) to the queue.');
  expect(say(enqueue(), 'stack')).toBe('Added (4,8) to the stack.');
  expect(say(enqueue(13), 'heap')).toBe('Added (4,8) to the priority queue with priority 13.');
  expect(say(enqueue(13, 4), 'heap', [reached(v, 9)])).toBe(
    'Added (4,8) to the priority queue with f = 13 (g 9 + h 4).',
  );
  expect(say(enqueue(4, 4), 'heap', [reached(v, 9)])).toBe(
    'Added (4,8) to the priority queue with h = 4.',
  );
});

it('gives the reason for a skip', () => {
  expect(say({ type: 'skip', node: v, reason: 'already visited', line: 6 })).toBe(
    'Skipped (4,8): already visited.',
  );
});

it('announces a pass', () => {
  expect(say({ type: 'pass', n: 3, line: 2 }, 'none')).toBe('Pass 3: checking every edge again.');
  expect(say({ type: 'pass', n: 1, line: 2 }, 'none')).toBe('Pass 1: checking every edge.');
});

it('announces the goal, or the meeting point of two searches', () => {
  expect(say({ type: 'found', node: goal, line: 4 })).toBe('Reached the goal at (4,9).');
  expect(say({ type: 'found', node: v, line: 8 })).toBe('The two searches met at (4,8).');
});

it('counts the steps of the traced path', () => {
  const nodes = Array.from({ length: 24 }, (_, i) => i);
  expect(say({ type: 'path', nodes, line: 4 })).toBe('Path traced: 23 steps.');
  expect(say({ type: 'path', nodes: [0, 1], line: 4 })).toBe('Path traced: 1 step.');
});

it('says so when there is no path', () => {
  expect(say({ type: 'noPath', line: 9 })).toBe('No path exists between start and end.');
});
