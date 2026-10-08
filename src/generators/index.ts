import { backtracker } from './backtracker';
import { prim } from './prim';
import { randomWalls } from './randomWalls';
import { randomWeights } from './randomWeights';
import { recursiveDivision } from './recursiveDivision';
import type { Generator } from './types';

export const GENERATORS: { id: string; name: string; run: Generator }[] = [
  { id: 'recursive-division', name: 'Maze: recursive division', run: recursiveDivision },
  { id: 'backtracker', name: 'Maze: randomized DFS', run: backtracker },
  { id: 'prim', name: "Maze: Prim's algorithm", run: prim },
  { id: 'random-walls', name: 'Random walls', run: randomWalls },
  { id: 'random-weights', name: 'Random weights', run: randomWeights },
];
