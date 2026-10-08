import { describe, expect, it } from 'vitest';
import { ALGORITHMS, getAlgorithm } from '../data/algorithms';
import { mulberry32 } from '../utils/rng';
import { toId } from './grid';
import { isAdmissible } from './heuristics';
import { expectLegalPath, outcome, parseGrid, randomCase, type Case } from './testUtils';
import type { HeuristicId, RunOptions, StepEvent } from './types';

const OPEN = ['S....', '.....', '.....', '.....', '....E'];
const GAP = ['S.#..', '..#..', '..#..', '.....', '..#.E'];
const SEALED = ['S.#.E', '..#..', '..#..'];
const HEAVY = ['S9E', '...'];

const STRAIGHT: RunOptions = { diagonal: false, heuristic: 'manhattan' };
const DIAGONAL: RunOptions = { diagonal: true, heuristic: 'octile' };

const ALL = ['bfs', 'dfs', 'dijkstra', 'astar', 'greedy', 'bidirectional', 'bellman-ford'];
/** Fewest steps on an unweighted grid. */
const SHORTEST = ['bfs', 'dijkstra', 'astar', 'bidirectional', 'bellman-ford'];
const WEIGHT_AWARE = ['dijkstra', 'astar', 'bellman-ford'];
const WEIGHT_BLIND = ['bfs', 'dfs', 'bidirectional'];
const HEURISTICS: HeuristicId[] = ['manhattan', 'euclidean', 'octile', 'chebyshev'];

function solveCase({ grid, start, end }: Case, id: string, options: RunOptions = STRAIGHT) {
  const events = getAlgorithm(id).run(grid, start, end, options);
  return { grid, start, end, events, ...outcome(grid, events) };
}

const solve = (id: string, rows: string[], options: RunOptions = STRAIGHT) =>
  solveCase(parseGrid(rows), id, options);

const ofType = <T extends StepEvent['type']>(events: StepEvent[], type: T) =>
  events.filter((e): e is Extract<StepEvent, { type: T }> => e.type === type);

it('registers the seven algorithms', () => {
  expect(ALGORITHMS.map((a) => a.id)).toEqual(ALL);
});

describe.each(ALL)('%s', (id) => {
  it('goes through the only gap', () => {
    expect(solve(id, GAP).path).toContain(toId(5, 3, 2));
  });

  it('reports no path when the goal is sealed off', () => {
    const result = solve(id, SEALED);
    expect(result.path).toBeNull();
    expect(result.events[result.events.length - 1].type).toBe('noPath');
    expect(ofType(result.events, 'found')).toHaveLength(0);
  });

  it('never crosses a wall and only makes legal moves', () => {
    for (const rows of [OPEN, GAP, HEAVY]) {
      const result = solve(id, rows);
      expectLegalPath(result.grid, result.path!, result.start, result.end, false);
    }
  });

  it('announces the start with distance 0', () => {
    const result = solve(id, OPEN);
    expect(result.events[0]).toMatchObject({
      type: 'relax',
      node: result.start,
      from: -1,
      oldDist: Infinity,
      newDist: 0,
      line: 1,
    });
  });

  it('ends with found then path when the goal is reachable', () => {
    const { events } = solve(id, GAP);
    expect(events.slice(-2).map((e) => e.type)).toEqual(['found', 'path']);
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

  it('is deterministic', () => {
    expect(solve(id, GAP).events).toEqual(solve(id, GAP).events);
  });
});

describe.each(SHORTEST)('%s finds shortest paths', (id) => {
  it('takes 8 steps across the open grid', () => {
    const result = solve(id, OPEN);
    expect(result.steps).toBe(8);
    expect(result.cost).toBe(8);
  });

  it('takes 8 steps through the gap', () => {
    expect(solve(id, GAP).steps).toBe(8);
  });
});

describe('weights', () => {
  it.each(WEIGHT_AWARE)('%s routes around a heavy cell', (id) => {
    const result = solve(id, HEAVY);
    expect(result.cost).toBe(4);
    expect(result.path).not.toContain(toId(3, 0, 1));
  });

  it.each(WEIGHT_BLIND)('%s ignores weights', (id) => {
    expect(solve(id, ['S9E', '.4.']).events).toEqual(solve(id, ['S.E', '...']).events);
  });

  it('bfs pays for the heavy cell it walks through', () => {
    const result = solve('bfs', HEAVY);
    expect(result.steps).toBe(2);
    expect(result.cost).toBe(10);
  });

  it('greedy walks straight through a heavy cell', () => {
    expect(solve('greedy', HEAVY).cost).toBe(10);
  });
});

describe('diagonal movement', () => {
  it.each(WEIGHT_AWARE)('%s costs 4√2 across the open grid', (id) => {
    expect(solve(id, OPEN, DIAGONAL).cost).toBeCloseTo(4 * Math.SQRT2);
  });

  it.each(['bfs', 'bidirectional'])('%s takes 4 diagonal steps across the open grid', (id) => {
    expect(solve(id, OPEN, DIAGONAL).steps).toBe(4);
  });
});

describe('event lines', () => {
  type Lines = {
    /** Events emitted at line 1 before the main loop starts. */
    setup: number;
    types: Partial<Record<StepEvent['type'], number>>;
    skips: Record<string, number[]>;
    noPath: number;
  };

  const best: Pick<Lines, 'setup' | 'types' | 'noPath'> = {
    setup: 2,
    types: { visit: 5, found: 6, path: 6, relax: 10, enqueue: 11 },
    noPath: 12,
  };

  const LINES: Record<string, Lines> = {
    bfs: {
      setup: 2,
      types: { visit: 3, found: 4, path: 4, relax: 7, enqueue: 8 },
      skips: { 'already discovered': [6] },
      noPath: 9,
    },
    dfs: {
      setup: 2,
      types: { visit: 5, found: 6, path: 6, relax: 9, enqueue: 9 },
      skips: { 'already visited': [4, 8] },
      noPath: 10,
    },
    dijkstra: {
      ...best,
      skips: { 'stale entry': [4], 'already settled': [7], 'no improvement': [9] },
    },
    astar: {
      ...best,
      skips: { 'stale entry': [4], 'already closed': [7], 'no improvement': [9] },
    },
    greedy: {
      setup: 2,
      types: { visit: 3, found: 4, path: 4, relax: 7, enqueue: 8 },
      skips: { 'already discovered': [6] },
      noPath: 9,
    },
    bidirectional: {
      setup: 4,
      types: { visit: 3, found: 8, path: 8, relax: 7, enqueue: 7 },
      skips: { 'reached by the other search': [5], 'already seen': [6] },
      noPath: 10,
    },
    'bellman-ford': {
      setup: 1,
      types: { pass: 2, visit: 3, relax: 6, found: 8, path: 8 },
      skips: {},
      noPath: 8,
    },
  };

  it.each(ALL)('%s tags each kind of event with its pseudocode line', (id) => {
    const lines = LINES[id];
    for (const rows of [GAP, HEAVY, ['S3..', '.9.2', '..4E']]) {
      const { events } = solve(id, rows);
      events.slice(0, lines.setup).forEach((event) => expect(event.line).toBe(1));
      for (const event of events.slice(lines.setup)) {
        if (event.type === 'skip')
          expect(lines.skips[event.reason], event.reason).toContain(event.line);
        else expect(event.line, event.type).toBe(lines.types[event.type]);
      }
    }
    const sealed = solve(id, SEALED).events;
    expect(sealed[sealed.length - 1].line).toBe(lines.noPath);
  });
});

describe('bfs', () => {
  it('visits cells in order of their distance from the start', () => {
    const { events } = solve('bfs', GAP);
    const dist = new Map<number, number>();
    for (const e of ofType(events, 'relax')) dist.set(e.node, e.newDist);
    const visited = ofType(events, 'visit').map((e) => dist.get(e.node)!);
    expect(visited).toEqual([...visited].sort((a, b) => a - b));
  });
});

describe('dfs', () => {
  it('finds a legal path that is longer than the shortest one', () => {
    const rows = ['......', '......', '......', '......', '......', 'S....E'];
    const result = solve('dfs', rows);
    expectLegalPath(result.grid, result.path!, result.start, result.end, false);
    expect(result.steps).toBeGreaterThan(5);
  });

  it('explores north first', () => {
    const { events, start } = solve('dfs', ['...', '.S.', '..E']);
    expect(ofType(events, 'visit')[1].node).toBe(start - 3);
  });
});

describe.each(['dijkstra', 'astar'])('%s', (id) => {
  it('settles cells in order of increasing priority', () => {
    const { events } = solve(id, ['S3..', '.9.2', '..4E']);
    const priority = new Map<number, number>();
    const settled: number[] = [];
    for (const event of events) {
      if (event.type === 'enqueue') priority.set(event.node, event.priority!);
      if (event.type === 'visit') settled.push(priority.get(event.node)!);
    }
    expect(settled).toEqual([...settled].sort((a, b) => a - b));
  });
});

describe('dijkstra', () => {
  it('enqueues each cell with its tentative distance as the priority', () => {
    const { events } = solve('dijkstra', HEAVY);
    events.forEach((event, i) => {
      if (event.type !== 'enqueue') return;
      const relax = events[i - 1];
      expect(event.priority).toBe(relax.type === 'relax' ? relax.newDist : NaN);
    });
  });
});

describe('astar', () => {
  it('enqueues each cell with f = g + h', () => {
    const { events } = solve('astar', ['S3..', '.9.2', '..4E']);
    events.forEach((event, i) => {
      if (event.type !== 'enqueue') return;
      const relax = events[i - 1];
      const g = relax.type === 'relax' ? relax.newDist : NaN;
      expect(event.priority).toBeCloseTo(g + event.h!);
    });
  });

  it('expands fewer cells than Dijkstra when the goal is far away', () => {
    const rows = Array.from({ length: 9 }, () => '.........');
    rows[4] = 'S.......E';
    const visits = (id: string) => ofType(solve(id, rows).events, 'visit').length;
    expect(visits('astar')).toBeLessThan(visits('dijkstra'));
  });
});

describe('greedy', () => {
  it('ranks cells by the heuristic alone', () => {
    const { events } = solve('greedy', ['S3..', '.9.2', '..4E']);
    for (const event of ofType(events, 'enqueue')) expect(event.priority).toBe(event.h);
  });
});

describe('bidirectional', () => {
  it('joins adjacent endpoints with a 1-step path', () => {
    const result = solve('bidirectional', ['SE']);
    expect(result.path).toEqual([result.start, result.end]);
  });

  it('searches from both ends and meets on the path', () => {
    const { events, path } = solve('bidirectional', GAP);
    const sides = new Set(ofType(events, 'visit').map((e) => e.side));
    expect(sides).toEqual(new Set([0, 1]));
    expect(path).toContain(ofType(events, 'found')[0].node);
  });

  it('visits fewer cells than BFS across an open grid', () => {
    const rows = Array.from({ length: 15 }, () => '...............');
    rows[7] = 'S.............E';
    const visits = (id: string) => ofType(solve(id, rows).events, 'visit').length;
    expect(visits('bidirectional')).toBeLessThan(visits('bfs'));
  });
});

describe('bellman-ford', () => {
  it('opens every pass with a pass event, numbered from 1', () => {
    const { events } = solve('bellman-ford', GAP);
    expect(events[1]).toEqual({ type: 'pass', n: 1, line: 2 });
    expect(ofType(events, 'pass').map((e) => e.n)).toEqual(
      ofType(events, 'pass').map((_, i) => i + 1),
    );
  });

  it('stops after a pass that changes nothing', () => {
    const { events } = solve('bellman-ford', GAP);
    const lastPass = events.findLastIndex((e) => e.type === 'pass');
    expect(events.slice(lastPass + 1).map((e) => e.type)).toEqual(['found', 'path']);
  });

  it('announces a cell before the relaxations made from it', () => {
    const { events } = solve('bellman-ford', GAP);
    let current = -1;
    for (const event of events.slice(1)) {
      if (event.type === 'visit') current = event.node;
      if (event.type === 'relax') expect(event.from).toBe(current);
    }
  });
});

describe('properties over random grids', () => {
  const GRIDS = 200;
  const weighted = (seed: number) =>
    randomCase(mulberry32(seed), 8, 12, { wall: 0.25, weight: 0.3 });
  const plain = (seed: number) => randomCase(mulberry32(seed), 8, 12, { wall: 0.25, weight: 0 });
  const seeds = Array.from({ length: GRIDS }, (_, i) => i + 1);

  it.each([false, true])(
    'A* cost equals Dijkstra cost for every admissible heuristic (diagonal %s)',
    (diagonal) => {
      let compared = 0;
      for (const seed of seeds) {
        const best = solveCase(weighted(seed), 'dijkstra', { diagonal, heuristic: 'manhattan' });
        for (const heuristic of HEURISTICS.filter((h) => isAdmissible(h, diagonal))) {
          const result = solveCase(weighted(seed), 'astar', { diagonal, heuristic });
          if (best.cost === null) expect(result.cost).toBeNull();
          else expect(result.cost).toBeCloseTo(best.cost, 9);
          compared++;
        }
      }
      expect(compared).toBe(GRIDS * (diagonal ? 3 : 4));
    },
  );

  it.each([false, true])('Bellman-Ford cost equals Dijkstra cost (diagonal %s)', (diagonal) => {
    const options = { diagonal, heuristic: 'manhattan' } as const;
    for (const seed of seeds) {
      const best = solveCase(weighted(seed), 'dijkstra', options).cost;
      const result = solveCase(weighted(seed), 'bellman-ford', options).cost;
      if (best === null) expect(result).toBeNull();
      else expect(result).toBeCloseTo(best, 9);
    }
  });

  it('BFS cost equals Dijkstra cost on unweighted 4-direction grids', () => {
    for (const seed of seeds) {
      expect(solveCase(plain(seed), 'bfs').cost).toBe(solveCase(plain(seed), 'dijkstra').cost);
    }
  });

  it.each([false, true])('bidirectional BFS path length equals BFS (diagonal %s)', (diagonal) => {
    const options = { diagonal, heuristic: 'manhattan' } as const;
    for (const seed of seeds) {
      expect(solveCase(weighted(seed), 'bidirectional', options).steps).toBe(
        solveCase(weighted(seed), 'bfs', options).steps,
      );
    }
  });

  it.each(ALL)('%s agrees with Dijkstra on whether a path exists, and never beats it', (id) => {
    for (const diagonal of [false, true]) {
      for (const heuristic of HEURISTICS) {
        for (const seed of seeds.slice(0, 60)) {
          const options = { diagonal, heuristic };
          const best = solveCase(weighted(seed), 'dijkstra', options);
          const result = solveCase(weighted(seed), id, options);
          expect(result.path === null).toBe(best.path === null);
          if (result.path === null) continue;
          expect(result.cost!).toBeGreaterThanOrEqual(best.cost! - 1e-9);
          expectLegalPath(result.grid, result.path, result.start, result.end, diagonal);
        }
      }
    }
  });

  it('some random grids have a path and some do not', () => {
    const reachable = seeds.filter((seed) => solveCase(weighted(seed), 'dijkstra').path !== null);
    expect(reachable.length).toBeGreaterThan(20);
    expect(reachable.length).toBeLessThan(GRIDS);
  });
});
