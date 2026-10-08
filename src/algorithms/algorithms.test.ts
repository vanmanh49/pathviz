import { describe, expect, it } from 'vitest';
import { getAlgorithm } from '../data/algorithms';
import { toId } from './grid';
import { expectLegalPath, outcome, parseGrid } from './testUtils';
import type { RunOptions, StepEvent } from './types';

const OPEN = ['S....', '.....', '.....', '.....', '....E'];
const GAP = ['S.#..', '..#..', '..#..', '.....', '..#.E'];
const SEALED = ['S.#.E', '..#..', '..#..'];
const HEAVY = ['S9E', '...'];

const STRAIGHT: RunOptions = { diagonal: false, heuristic: 'manhattan' };
const DIAGONAL: RunOptions = { diagonal: true, heuristic: 'octile' };

function solve(id: string, rows: string[], options: RunOptions = STRAIGHT) {
  const { grid, start, end } = parseGrid(rows);
  const events = getAlgorithm(id).run(grid, start, end, options);
  return { grid, start, end, events, ...outcome(grid, events) };
}

const ofType = <T extends StepEvent['type']>(events: StepEvent[], type: T) =>
  events.filter((e): e is Extract<StepEvent, { type: T }> => e.type === type);

describe.each(['bfs', 'dijkstra'])('%s', (id) => {
  it('finds the 8-step path on an open grid', () => {
    const result = solve(id, OPEN);
    expect(result.steps).toBe(8);
    expect(result.cost).toBe(8);
  });

  it('goes through the only gap', () => {
    const result = solve(id, GAP);
    expect(result.steps).toBe(8);
    expect(result.path).toContain(toId(5, 3, 2));
  });

  it('reports no path when the goal is sealed off', () => {
    const result = solve(id, SEALED);
    expect(result.path).toBeNull();
    expect(result.events[result.events.length - 1].type).toBe('noPath');
    expect(ofType(result.events, 'found')).toHaveLength(0);
  });

  it('never crosses a wall and only makes legal moves', () => {
    const result = solve(id, GAP);
    expectLegalPath(result.grid, result.path!, result.start, result.end, false);
  });

  it('announces the start with distance 0', () => {
    const result = solve(id, OPEN);
    expect(result.events[0]).toEqual({
      type: 'relax',
      node: result.start,
      from: -1,
      oldDist: Infinity,
      newDist: 0,
      line: 1,
    });
  });

  it('ends with found then path when the goal is reachable', () => {
    const { events, end } = solve(id, GAP);
    expect(events.slice(-2).map((e) => e.type)).toEqual(['found', 'path']);
    expect(events[events.length - 2]).toMatchObject({ node: end });
  });

  it('emits only lines that exist in its pseudocode', () => {
    const { pseudocode } = getAlgorithm(id);
    for (const rows of [OPEN, GAP, SEALED, HEAVY]) {
      for (const event of solve(id, rows).events) {
        expect(event.line).toBeGreaterThanOrEqual(1);
        expect(event.line).toBeLessThanOrEqual(pseudocode.length);
      }
    }
  });

  it('will not cut a wall corner', () => {
    expect(solve(id, ['S#', '#E'], DIAGONAL).path).toBeNull();
    const around = solve(id, ['S.', '#E'], DIAGONAL);
    expect(around.steps).toBe(2);
    expect(around.cost).toBe(2);
  });
});

describe('bfs', () => {
  it('ignores weights', () => {
    const result = solve('bfs', HEAVY);
    expect(result.steps).toBe(2);
    expect(result.cost).toBe(10);
  });

  it('takes 4 diagonal steps across the open grid', () => {
    expect(solve('bfs', OPEN, DIAGONAL).steps).toBe(4);
  });

  it('tags each kind of event with its pseudocode line', () => {
    const { events } = solve('bfs', GAP);
    const lines = { visit: 3, found: 4, path: 4, skip: 6, relax: 7, enqueue: 8 } as const;
    for (const event of events.slice(2)) {
      expect(event.line, event.type).toBe(lines[event.type as keyof typeof lines]);
    }
    expect(solve('bfs', SEALED).events.slice(-1)[0].line).toBe(9);
  });

  it('visits cells in order of their distance from the start', () => {
    const { events } = solve('bfs', GAP);
    const dist = new Map<number, number>();
    for (const e of ofType(events, 'relax')) dist.set(e.node, e.newDist);
    const visited = ofType(events, 'visit').map((e) => dist.get(e.node)!);
    expect(visited).toEqual([...visited].sort((a, b) => a - b));
  });
});

describe('dijkstra', () => {
  it('routes around a heavy cell', () => {
    const result = solve('dijkstra', HEAVY);
    expect(result.cost).toBe(4);
    expect(result.path).not.toContain(toId(3, 0, 1));
  });

  it('costs 4√2 across the open grid with diagonals', () => {
    expect(solve('dijkstra', OPEN, DIAGONAL).cost).toBeCloseTo(4 * Math.SQRT2);
  });

  it('enqueues each cell with its tentative distance as the priority', () => {
    const { events } = solve('dijkstra', HEAVY);
    events.forEach((event, i) => {
      if (event.type !== 'enqueue') return;
      const relax = events[i - 1];
      expect(relax.type).toBe('relax');
      expect(event.priority).toBe(relax.type === 'relax' ? relax.newDist : NaN);
    });
  });

  it('settles cells in order of increasing distance', () => {
    const { events } = solve('dijkstra', ['S3..', '.9.2', '..4E']);
    const dist = new Map<number, number>();
    const settled: number[] = [];
    for (const event of events) {
      if (event.type === 'relax') dist.set(event.node, event.newDist);
      if (event.type === 'visit') settled.push(dist.get(event.node)!);
    }
    expect(settled).toEqual([...settled].sort((a, b) => a - b));
  });

  it('tags each kind of event with its pseudocode line', () => {
    const { events } = solve('dijkstra', HEAVY);
    const lines = { visit: 5, found: 6, path: 6, relax: 10, enqueue: 11 } as const;
    const skips: Record<string, number> = {
      'stale entry': 4,
      'already settled': 7,
      'no improvement': 9,
    };
    for (const event of events.slice(2)) {
      const expected =
        event.type === 'skip' ? skips[event.reason] : lines[event.type as keyof typeof lines];
      expect(event.line, event.type).toBe(expected);
    }
    expect(solve('dijkstra', SEALED).events.slice(-1)[0].line).toBe(12);
  });
});
