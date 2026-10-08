import { bfs } from '../algorithms/bfs';
import { dijkstra } from '../algorithms/dijkstra';
import type { Algorithm, FrontierKind } from '../algorithms/types';

export interface AlgorithmInfo {
  id: string;
  name: string;
  run: Algorithm;
  description: string;
  /** Whether cell weights influence the search. */
  weighted: boolean;
  optimal: 'yes' | 'no' | 'conditional';
  optimalNote: string;
  time: string;
  space: string;
  frontier: FrontierKind;
  usesHeuristic: boolean;
  /** One entry per line. Step events refer to these lines by 1-based number. */
  pseudocode: string[];
}

/**
 * Everything the interface knows about an algorithm. To add one, write its
 * function in `src/algorithms/` and append an entry here.
 */
export const ALGORITHMS: AlgorithmInfo[] = [
  {
    id: 'bfs',
    name: 'Breadth-First Search',
    run: bfs,
    description:
      'Explores in rings: every cell one step from the start, then every cell two steps away, and so on. The first time it reaches the goal it has used the fewest steps possible.',
    weighted: false,
    optimal: 'yes',
    optimalNote:
      'Fewest steps. It ignores weights, so on weighted terrain a cheaper route may exist.',
    time: 'O(V + E)',
    space: 'O(V)',
    frontier: 'queue',
    usesHeuristic: false,
    pseudocode: [
      'queue ← [start]; dist[start] ← 0',
      'while queue is not empty:',
      '  u ← queue.dequeue()',
      '  if u = goal: return path',
      '  for each neighbor v of u:',
      '    if v was already discovered: skip',
      '    dist[v] ← dist[u] + 1; parent[v] ← u',
      '    queue.enqueue(v)',
      'return no path',
    ],
  },
  {
    id: 'dijkstra',
    name: "Dijkstra's Algorithm",
    run: dijkstra,
    description:
      'Always settles the unsettled cell with the smallest known distance from the start. No cheaper route to that cell can turn up later, so its distance is final.',
    weighted: true,
    optimal: 'yes',
    optimalNote: 'Always, as long as no weight is negative.',
    time: 'O((V + E) log V)',
    space: 'O(V)',
    frontier: 'heap',
    usesHeuristic: false,
    pseudocode: [
      'dist[start] ← 0; pq ← {start}',
      'while pq is not empty:',
      '  u ← pq.extractMin()',
      '  if u was already settled: skip',
      '  mark u settled',
      '  if u = goal: return path',
      '  for each neighbor v of u not settled:',
      '    alt ← dist[u] + cost(u, v)',
      '    if alt < dist[v]:',
      '      dist[v] ← alt; parent[v] ← u',
      '      pq.insert(v, alt)',
      'return no path',
    ],
  },
];

export function getAlgorithm(id: string): AlgorithmInfo {
  const info = ALGORITHMS.find((a) => a.id === id);
  if (!info) throw new Error(`Unknown algorithm: ${id}`);
  return info;
}
