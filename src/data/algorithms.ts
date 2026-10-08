import { astar } from '../algorithms/astar';
import { bellmanFord } from '../algorithms/bellmanFord';
import { bfs } from '../algorithms/bfs';
import { bidirectionalBfs } from '../algorithms/bidirectionalBfs';
import { dfs } from '../algorithms/dfs';
import { dijkstra } from '../algorithms/dijkstra';
import { greedy } from '../algorithms/greedy';
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
    id: 'dfs',
    name: 'Depth-First Search',
    run: dfs,
    description:
      'Follows one route as far as it will go and backs up only when it hits a dead end. It finds a path if one exists, but rarely a short one.',
    weighted: false,
    optimal: 'no',
    optimalNote:
      'No. It commits to the first direction it tries and returns the first route that reaches the goal, however winding. A shorter route it never explored may exist.',
    time: 'O(V + E)',
    space: 'O(V)',
    frontier: 'stack',
    usesHeuristic: false,
    pseudocode: [
      'stack ← [start]',
      'while stack is not empty:',
      '  u ← stack.pop()',
      '  if u was already visited: skip',
      '  mark u visited',
      '  if u = goal: return path',
      '  for each neighbor v of u:',
      '    if v is not visited:',
      '      parent[v] ← u; stack.push(v)',
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
  {
    id: 'astar',
    name: 'A* Search',
    run: astar,
    description:
      'Dijkstra with a sense of direction. Each cell is ranked by f = g + h: the cost so far plus an estimate of the cost still to come, so the search leans toward the goal.',
    weighted: true,
    optimal: 'conditional',
    optimalNote:
      'Yes, as long as the heuristic never overestimates the remaining cost. Manhattan does overestimate once diagonal moves are allowed.',
    time: 'O((V + E) log V)',
    space: 'O(V)',
    frontier: 'heap',
    usesHeuristic: true,
    pseudocode: [
      'g[start] ← 0; open ← {start}, f = h(start)',
      'while open is not empty:',
      '  u ← node in open with the lowest f',
      '  if u is already closed: skip',
      '  close u',
      '  if u = goal: return path',
      '  for each neighbor v of u not closed:',
      '    alt ← g[u] + cost(u, v)',
      '    if alt < g[v]:',
      '      g[v] ← alt; parent[v] ← u',
      '      open.insert(v, f = alt + h(v))',
      'return no path',
    ],
  },
  {
    id: 'greedy',
    name: 'Greedy Best-First Search',
    run: greedy,
    description:
      'Always expands the cell that looks closest to the goal, judged by the heuristic alone. Quick when the way is clear, easily fooled by obstacles and weights.',
    weighted: false,
    optimal: 'no',
    optimalNote:
      'No. It ranks cells only by the estimated distance left and ignores the cost already paid, so it can commit to a long or expensive route.',
    time: 'O((V + E) log V)',
    space: 'O(V)',
    frontier: 'heap',
    usesHeuristic: true,
    pseudocode: [
      'open ← {start}, priority h(start)',
      'while open is not empty:',
      '  u ← node in open with the lowest h',
      '  if u = goal: return path',
      '  for each neighbor v of u:',
      '    if v was already discovered: skip',
      '    parent[v] ← u',
      '    open.insert(v, h(v))',
      'return no path',
    ],
  },
  {
    id: 'bidirectional',
    name: 'Bidirectional BFS',
    run: bidirectionalBfs,
    description:
      'Runs two breadth-first searches at once, one from the start and one from the goal, a ring at a time, until they meet in the middle. Each covers far less ground than a single search would.',
    weighted: false,
    optimal: 'yes',
    optimalNote: 'Fewest steps, like BFS. It ignores weights.',
    time: 'O(V + E)',
    space: 'O(V)',
    frontier: 'queue',
    usesHeuristic: false,
    pseudocode: [
      'queueA ← [start]; queueB ← [goal]',
      'while both queues are not empty:',
      "  for each node u in this side's level:",
      '    for each neighbor v of u:',
      '      if the other side reached v: note it',
      '      else if this side has not seen v:',
      '        parent[v] ← u; enqueue v',
      '  if a meeting was noted: return the path',
      '  switch sides',
      'return no path',
    ],
  },
  {
    id: 'bellman-ford',
    name: 'Bellman-Ford',
    run: bellmanFord,
    description:
      'Makes repeated passes over every edge, shortening any distance it can. Once a pass changes nothing, every distance is final. Slower than Dijkstra, but it is the one that copes with negative weights.',
    weighted: true,
    optimal: 'yes',
    optimalNote:
      "Always. It cannot stop early: the goal's distance is only final once a whole pass changes nothing.",
    time: 'O(V · E)',
    space: 'O(V)',
    frontier: 'none',
    usesHeuristic: false,
    pseudocode: [
      'dist[start] ← 0',
      'repeat up to |V| − 1 times:',
      '  for each cell u with a known distance:',
      '    for each neighbor v of u:',
      '      if dist[u] + cost(u, v) < dist[v]:',
      '        dist[v] ← that sum; parent[v] ← u',
      '  if nothing changed in this pass: stop',
      'return path if dist[goal] is known',
    ],
  },
];

export function getAlgorithm(id: string): AlgorithmInfo {
  const info = ALGORITHMS.find((a) => a.id === id);
  if (!info) throw new Error(`Unknown algorithm: ${id}`);
  return info;
}
